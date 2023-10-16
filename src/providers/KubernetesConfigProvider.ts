import { AbstractConfigProvider } from './AbstractConfigProvider';
import _ from 'lodash';
import { ResourceInfo } from '../types';

const DEFAULT_SERVER_PORT_TYPE = 'rest';

function toEnvName(name: string) {
    return name.toUpperCase().trim().replace(/[.,-]/g, '_');
}

/**
 * Kubernetes config provider - used when running kapeta clusters within kubernetes
 *
 * @implements {ConfigProvider}
 */
export class KubernetesConfigProvider extends AbstractConfigProvider {
    private _configuration: any;
    private _instanceHosts: any;

    /**
     *
     * @param {string} blockRef
     * @param {string} systemId
     * @param {string} instanceId
     * @param {BlockDefinition} blockDefinition
     * @return {Promise<KubernetesConfigProvider>}
     */
    static async create(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        return new KubernetesConfigProvider(blockRef, systemId, instanceId, blockDefinition);
    }

    constructor(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        super(blockRef, systemId, instanceId, blockDefinition);

        this._configuration = null;
    }

    /**
     * Get port to listen on for current instance
     *
     */
    async getServerPort(portType?: string) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        const envVar = `KAPETA_PROVIDER_PORT_${toEnvName(portType)}`;
        if (envVar in process.env) {
            return process.env[envVar]!;
        }

        return '80'; //We default to port 80
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`;
        if (envVar in process.env) {
            return process.env[envVar]!;
        }

        //Any host within docker container
        return '0.0.0.0';
    }

    async getServiceAddress(resourceName: string, portType: string) {
        const envVar = `KAPETA_CONSUMER_SERVICE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        if (envVar in process.env) {
            return process.env[envVar]!;
        }

        throw new Error(`Missing environment variable for internal resource: ${envVar}`);
    }

    async getResourceInfo(resourceType: string, portType: string, resourceName: string) {
        const envVar = `KAPETA_CONSUMER_RESOURCE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        if (envVar in process.env) {
            return JSON.parse(process.env[envVar]!) as ResourceInfo;
        }

        throw new Error(`Missing environment variable for operator resource: ${envVar}`);
    }

    getProviderId() {
        return 'kubernetes';
    }

    getConfiguration<T>(path: string, defaultValue?: T): T | undefined {
        if (!this._configuration) {
            const envVar = `KAPETA_INSTANCE_CONFIG`;
            if (envVar in process.env) {
                try {
                    this._configuration = JSON.parse(process.env[envVar]!);
                } catch (e) {
                    throw new Error(`Invalid JSON in environment variable: ${envVar}`);
                }
            } else {
                console.warn(`Missing environment variable for instance configuration: ${envVar}`);
                return defaultValue;
            }

            if (!this._configuration) {
                this._configuration = {};
            }
        }

        return _.get(this._configuration, path, defaultValue);
    }

    async getInstanceHost(instanceId: string): Promise<string> {
        if (!this._instanceHosts) {
            if (process.env.KAPETA_BLOCK_HOSTS) {
                try {
                    this._instanceHosts = JSON.parse(process.env.KAPETA_BLOCK_HOSTS);
                } catch (e) {
                    throw new Error(`Invalid JSON in environment variable: KAPETA_BLOCK_HOSTS`);
                }
            } else {
                throw new Error('Environment variable KAPETA_BLOCK_HOSTS not found. Could not resolve instance host');
            }
        }

        if (instanceId in this._instanceHosts) {
            return this._instanceHosts[instanceId];
        }

        throw new Error(`Unknown instance id when resolving host: ${instanceId}.`);
    }

    async getInstanceProviderUrl(instanceId: string, portType: string, resourceName: string): Promise<string> {
        //TODO: Implement this (KAP-764)
        throw new Error('Method not implemented.');
    }
}
