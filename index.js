const FS = require('fs');
const Path = require('path');
const YAML = require('yaml');
const LocalConfigProvider = require('./src/providers/LocalConfigProvider');
const KubernetesConfigProvider = require('./src/providers/KubernetesConfigProvider');

const KAPETA_SYSTEM_TYPE = "KAPETA_SYSTEM_TYPE";
const KAPETA_SYSTEM_ID = "KAPETA_SYSTEM_ID";
const KAPETA_BLOCK_REF = "KAPETA_BLOCK_REF";
const KAPETA_INSTANCE_ID = "KAPETA_INSTANCE_ID";

const DEFAULT_SYSTEM_TYPE = "development";
const DEFAULT_SYSTEM_ID = "";
const DEFAULT_INSTANCE_ID = "";

if (!global.KAPETA_SDK_NODEJS_CONFIG) {
    //We want these values to be truly global within the VM
    global.KAPETA_SDK_NODEJS_CONFIG = {
        PROVIDER: null,
        CALLBACKS: []
    }
}

const CONFIG = global.KAPETA_SDK_NODEJS_CONFIG;

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
     * @param {(provider:AbstractConfigProvider) => {}} callback
     */
    static onReady(callback) {
        if (CONFIG.PROVIDER) {
            callback(CONFIG.PROVIDER);
            return;
        }

        CONFIG.CALLBACKS.push(callback);
    }


    /**
     * Inits and loads config provider
     *
     * @param {string} blockDir
     * @param {string} healthEndpoint
     * @param {string} [portType="rest"]
     *
     * @return {Promise<ConfigProvider>}
     */
    static async init(blockDir, healthEndpoint, portType) {
        if (CONFIG.PROVIDER) {
            throw new Error('Configuration already initialised once');
        }

        let blockYMLPath = Path.join(blockDir, 'kapeta.yml');

        if (!FS.existsSync(blockYMLPath)) {
            throw new Error('kapeta.yml file not found in path: ' + blockDir + '. Path must be absolute and point to a folder with a valid block definition.');
        }

        const blockDefinition = YAML.parse(FS.readFileSync(blockYMLPath).toString());
        if (!blockDefinition?.metadata?.name) {
            throw new Error('kapeta.yml file contained invalid YML: ' + blockDir + '. ');
        }

        const blockRefLocal = `${blockDefinition?.metadata?.name}:local`;

        const systemType = getSystemConfiguration(
            KAPETA_SYSTEM_TYPE,
            DEFAULT_SYSTEM_TYPE).toLowerCase();

        const blockRef = getSystemConfiguration(
            KAPETA_BLOCK_REF,
            blockRefLocal);

        const systemId = getSystemConfiguration(
            KAPETA_SYSTEM_ID,
            DEFAULT_SYSTEM_ID);

        const instanceId = getSystemConfiguration(
            KAPETA_INSTANCE_ID,
            DEFAULT_INSTANCE_ID);

        /**
         *
         * @type {ConfigProvider}
         */
        let provider = null;

        switch (systemType) {
            case "k8s":
            case "kubernetes":
                provider = await KubernetesConfigProvider.create(
                    blockRef,
                    systemId,
                    instanceId,
                    blockDefinition
                );
                break;

            case "development":
            case "dev":
            case "local":
                const localProvider = await LocalConfigProvider.create(
                    blockRef,
                    systemId,
                    instanceId,
                    blockDefinition
                );

                //Only relevant locally:
                await localProvider.registerInstance(healthEndpoint, portType);

                provider = localProvider;

                break;

            default:
                throw new Error("Unknown environment: " + systemType);

        }

        CONFIG.PROVIDER = provider;

        while(CONFIG.CALLBACKS.length > 0) {
            const callback = CONFIG.CALLBACKS.shift();
            await callback(CONFIG.PROVIDER);
        }

        return provider;
    }
}


module.exports = Config;
