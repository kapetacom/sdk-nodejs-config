const LocalProvider = require('./src/providers/LocalConfigProvider');

let PROVIDER = null;

const BLOCKWARE_SYSTEM_TYPE = "BLOCKWARE_SYSTEM_TYPE";
const BLOCKWARE_SYSTEM_ID = "BLOCKWARE_SYSTEM_ID";

const DEFAULT_SYSTEM_TYPE = "development";
const DEFAULT_SYSTEM_ID = "default";

const CALLBACKS = [];

function getSystemConfiguration(envVarName, defaultValue) {
    if (process.env[envVarName]) {
        return process.env[envVarName];
    }

    return defaultValue;
}

class Config {



    /**
     * Provide callback for when configuration is ready.
     *
     * @param {Function} callback
     */
    static onReady(callback) {
        if (PROVIDER) {
            callback(PROVIDER);
            return;
        }

        CALLBACKS.push(callback);
    }



    /**
     * Inits and loads config provider
     *
     * @return {Promise<ConfigProvider>}
     */
    static async init(serviceName) {
        if (PROVIDER) {
            throw new Error('Configuration already initialised once');
        }

        const systemType = getSystemConfiguration(
            BLOCKWARE_SYSTEM_TYPE,
            DEFAULT_SYSTEM_TYPE).toLowerCase();

        const systemId = getSystemConfiguration(
            BLOCKWARE_SYSTEM_ID,
            DEFAULT_SYSTEM_ID);

        let provider = null;

        switch (systemType) {
            case "staging":
            case "sandbox":

            case "production":
            case "prod":
                throw new Error("Unimplemented environment support: " + systemType);

            case "development":
            case "dev":
            case "local":
                provider = new LocalProvider(serviceName, systemId);
                break;

            default:
                throw new Error("Unknown environment: " + systemType);

        }

        await provider.load();

        PROVIDER = provider;

        while(CALLBACKS.length > 0) {
            const callback = CALLBACKS.shift();
            await callback(PROVIDER);
        }

        return provider;
    }
}


module.exports = Config;