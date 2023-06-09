import YAML from 'yaml';
import Path from 'path';
import FS from 'fs';
import { ConfigProvider, InstanceProviderValue, InstanceValue } from './src/types';

import { KubernetesConfigProvider } from './src/providers/KubernetesConfigProvider';
import { LocalConfigProvider } from './src/providers/LocalConfigProvider';

const KAPETA_SYSTEM_TYPE = 'KAPETA_SYSTEM_TYPE';
const KAPETA_SYSTEM_ID = 'KAPETA_SYSTEM_ID';
const KAPETA_BLOCK_REF = 'KAPETA_BLOCK_REF';
const KAPETA_INSTANCE_ID = 'KAPETA_INSTANCE_ID';

const DEFAULT_SYSTEM_TYPE = 'development';
const DEFAULT_SYSTEM_ID = '';
const DEFAULT_INSTANCE_ID = '';

if (!('KAPETA_SDK_NODEJS_CONFIG' in global)) {
    //We want these values to be truly global within the VM
    // @ts-ignore
    global['KAPETA_SDK_NODEJS_CONFIG'] = {
        PROVIDER: null,
        CALLBACKS: [],
    };
}

// @ts-ignore
const CONFIG = global['KAPETA_SDK_NODEJS_CONFIG'];

function getSystemConfiguration(envVarName: string, defaultValue: string): string {
    if (process.env[envVarName]) {
        return process.env[envVarName]!;
    }

    return defaultValue;
}

class Config {
    /**
     * Provide callback for when configuration is ready.
     *
     * @param {(provider:AbstractConfigProvider) => {}} callback
     */
    static onReady(callback: (provider: ConfigProvider) => {}) {
        if (CONFIG.PROVIDER) {
            callback(CONFIG.PROVIDER);
            return;
        }

        CONFIG.CALLBACKS.push(callback);
    }

    static isReady() {
        return !!CONFIG.PROVIDER;
    }

    /**
     * Get provider - if not ready, will throw an error
     * @return {ConfigProvider}
     */
    static getProvider() {
        if (!CONFIG.PROVIDER) {
            throw new Error('Configuration not yet initialised');
        }
        return CONFIG.PROVIDER;
    }

    /**
     * Get configuration value
     *
     * @param {string} path
     * @param {any} defaultValue
     * @return {any}
     */
    static get<T>(path: string, defaultValue?: T): T | undefined {
        return Config.getProvider().getConfiguration(path, defaultValue);
    }

    static getAsInstanceHost(path: string, defaultValue?: string) {
        /**
         *
         * @type {InstanceValue}
         */
        const instance = Config.get<InstanceValue>(path);
        if (!instance) {
            return defaultValue;
        }
        return Config.getInstanceHost(instance.id);
    }

    static getAsInstanceProvider(path: string, defaultValue: string) {
        /**
         *
         * @type {InstanceProviderValue}
         */
        const instanceProvider = Config.get<InstanceProviderValue>(path);
        if (!instanceProvider) {
            return defaultValue;
        }
        return Config.getInstanceProviderUrl(
            instanceProvider.id,
            instanceProvider.portType,
            instanceProvider.resourceName
        );
    }

    /**
     * Get base url for instance and resource
     */
    static async getInstanceProviderUrl(instanceId: string, portType: string, resourceName: string) {
        return Config.getProvider().getInstanceProviderUrl(instanceId, portType, resourceName);
    }

    /**
     * Get hostname and port for instance
     */
    static getInstanceHost(instanceId: string) {
        return Config.getProvider().getInstanceHost(instanceId);
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
    static async init(blockDir: string, healthEndpoint: string, portType: string = 'rest') {
        if (CONFIG.PROVIDER) {
            throw new Error('Configuration already initialised once');
        }

        let blockYMLPath = Path.join(blockDir, 'kapeta.yml');

        if (!FS.existsSync(blockYMLPath)) {
            throw new Error(
                'kapeta.yml file not found in path: ' +
                    blockDir +
                    '. Path must be absolute and point to a folder with a valid block definition.'
            );
        }

        const blockDefinition = YAML.parse(FS.readFileSync(blockYMLPath).toString());
        if (!blockDefinition?.metadata?.name) {
            throw new Error('kapeta.yml file contained invalid YML: ' + blockDir + '. ');
        }

        const blockRefLocal = `${blockDefinition?.metadata?.name}:local`;

        const systemType = getSystemConfiguration(KAPETA_SYSTEM_TYPE, DEFAULT_SYSTEM_TYPE).toLowerCase();

        const blockRef = getSystemConfiguration(KAPETA_BLOCK_REF, blockRefLocal);

        const systemId = getSystemConfiguration(KAPETA_SYSTEM_ID, DEFAULT_SYSTEM_ID);

        const instanceId = getSystemConfiguration(KAPETA_INSTANCE_ID, DEFAULT_INSTANCE_ID);

        /**
         *
         * @type {ConfigProvider}
         */
        let provider = null;

        switch (systemType) {
            case 'k8s':
            case 'kubernetes':
                provider = await KubernetesConfigProvider.create(blockRef, systemId, instanceId, blockDefinition);
                break;

            case 'development':
            case 'dev':
            case 'local':
                const localProvider = await LocalConfigProvider.create(blockRef, systemId, instanceId, blockDefinition);

                //Only relevant locally:
                await localProvider.registerInstance(healthEndpoint, portType);

                provider = localProvider;

                break;

            default:
                throw new Error('Unknown environment: ' + systemType);
        }

        CONFIG.PROVIDER = provider;

        while (CONFIG.CALLBACKS.length > 0) {
            const callback = CONFIG.CALLBACKS.shift();
            await callback(CONFIG.PROVIDER);
        }

        return provider;
    }
}

export * from './src/types';
export * from './src/providers/AbstractConfigProvider';
export * from './src/providers/LocalConfigProvider';
export * from './src/providers/KubernetesConfigProvider';
export default Config;
