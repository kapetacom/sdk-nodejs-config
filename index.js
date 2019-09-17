const FS = require('fs');
const Path = require('path');
const LocalProvider = require('./src/providers/LocalConfigProvider');

let PROVIDER = null;

const BLOCKWARE_SYSTEM_TYPE = "BLOCKWARE_SYSTEM_TYPE";
const BLOCKWARE_SYSTEM_ID = "BLOCKWARE_SYSTEM_ID";
const BLOCKWARE_BLOCK_REF = "BLOCKWARE_BLOCK_REF";
const BLOCKWARE_INSTANCE_ID = "BLOCKWARE_INSTANCE_ID";

const DEFAULT_SYSTEM_TYPE = "development";
const DEFAULT_SYSTEM_ID = "";
const DEFAULT_INSTANCE_ID = "";

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
    static async init(blockDir) {
        if (PROVIDER) {
            throw new Error('Configuration already initialised once');
        }

        let blockYMLPath = Path.join(blockDir, 'block.yml');

        if (!FS.existsSync(blockYMLPath)) {
            //Try again with .yaml
            blockYMLPath = Path.join(blockDir, 'block.yaml');
        }

        if (!FS.existsSync(blockYMLPath)) {
            throw new Error('block.yml or block.yaml file not found in path: ' + blockDir + '. Path must be absolute and point to a folder with a valid block definition.');
        }

        const systemType = getSystemConfiguration(
            BLOCKWARE_SYSTEM_TYPE,
            DEFAULT_SYSTEM_TYPE).toLowerCase();

        const blockRef = getSystemConfiguration(
            BLOCKWARE_BLOCK_REF,
            'file://' + blockYMLPath);

        const systemId = getSystemConfiguration(
            BLOCKWARE_SYSTEM_ID,
            DEFAULT_SYSTEM_ID);

        const instanceId = getSystemConfiguration(
            BLOCKWARE_INSTANCE_ID,
            DEFAULT_INSTANCE_ID);

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
                provider = await LocalProvider.create(blockRef, systemId, instanceId);
                break;

            default:
                throw new Error("Unknown environment: " + systemType);

        }

        PROVIDER = provider;

        while(CALLBACKS.length > 0) {
            const callback = CALLBACKS.shift();
            await callback(PROVIDER);
        }

        return provider;
    }
}


module.exports = Config;