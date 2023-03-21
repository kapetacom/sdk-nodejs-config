const AbstractConfigProvider = require('./AbstractConfigProvider');

const DEFAULT_SERVER_PORT_TYPE = "rest";

function toEnvName(name) {
    return name.toUpperCase()
        .trim()
        .replace(/[.,-]/g,'_');
}

/**
 * Kubernetes config provider - used when running kapeta clusters within kubernetes
 *
 * @implements {ConfigProvider}
 */
class KubernetesConfigProvider extends AbstractConfigProvider {

    /**
     *
     * @param {string} blockRef
     * @param {string} systemId
     * @param {string} instanceId
     * @return {Promise<KubernetesConfigProvider>}
     */
    static async create(blockRef, systemId, instanceId) {
        return new KubernetesConfigProvider(blockRef, systemId, instanceId);
    }

    constructor(blockRef, systemId, instanceId) {
        super(blockRef, systemId, instanceId);
    }

    /**
     * Get port to listen on for current instance
     *
     */
    async getServerPort(portType) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        const envVar = `KAPETA_PROVIDER_PORT_${toEnvName(portType)}`
        if (envVar in process.env) {
            return parseInt(process.env[envVar]);
        }

        return 80; //We default to port 80
    }

    async getServiceAddress(resourceName, portType) {
        const envVar = `KAPETA_CONSUMER_SERVICE_${toEnvName(resourceName)}_${toEnvName(portType)}`
        if (envVar in process.env) {
            return process.env[envVar];
        }

        throw new Error(`Missing environment variable for internal resource: ${envVar}`);
    }

    async getResourceInfo(resourceType, portType, resourceName) {
        const envVar = `KAPETA_CONSUMER_RESOURCE_${toEnvName(resourceName)}_${toEnvName(portType)}`
        if (envVar in process.env) {
            return process.env[envVar];
        }

        throw new Error(`Missing environment variable for operator resource: ${envVar}`);
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`
        if (envVar in process.env) {
            return process.env[envVar];
        }

        //Any host within docker container
        return '0.0.0.0';
    }

    getProviderId() {
        return 'kubernetes';
    }
}


module.exports = KubernetesConfigProvider;
