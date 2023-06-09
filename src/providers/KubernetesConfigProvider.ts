import { AbstractConfigProvider } from './AbstractConfigProvider';
import _ from 'lodash';

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
            return process.env[envVar]!;
        }

        throw new Error(`Missing environment variable for operator resource: ${envVar}`);
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`;
        if (envVar in process.env) {
            return process.env[envVar]!;
        }

        //Any host within docker container
        return '0.0.0.0';
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

    getInstanceHost(instanceId: string): Promise<string> {
        throw new Error('Method not implemented.');
    }

    getInstanceProviderUrl(instanceId: string, portType: string, resourceName: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
}
