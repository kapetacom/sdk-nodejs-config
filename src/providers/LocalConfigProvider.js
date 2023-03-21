const Request = require("request");
const YAML = require("yaml");
const KapetaClusterConfig = require('@kapeta/local-cluster-config');
const AbstractConfigProvider = require('./AbstractConfigProvider');

const HEADER_KAPETA_BLOCK = "X-Kapeta-Block";
const HEADER_KAPETA_SYSTEM = "X-Kapeta-System";
const HEADER_KAPETA_INSTANCE = "X-Kapeta-Instance";
const DEFAULT_SERVER_PORT_TYPE = "rest";

/**
 * Local config provider - used when running local kapeta clusters during development and testing.
 *
 * @implements {ConfigProvider}
 */
class LocalConfigProvider extends AbstractConfigProvider {

    /**
     *
     * @param {string} blockRef
     * @param {string} systemId
     * @param {string} instanceId
     * @return {Promise<LocalConfigProvider>}
     */
    static async create(blockRef, systemId, instanceId) {
        const configProvider = new LocalConfigProvider(blockRef, systemId, instanceId);

        await configProvider.load();

        await configProvider.resolveIdentity();

        return configProvider;
    }

    constructor(blockRef, systemId, instanceId) {
        super(blockRef, systemId, instanceId);
    }

    /**
     * Resolve and verify system and instance id
     * @returns {Promise<void>}
     */
    async resolveIdentity() {
        console.log('Resolving identity for block: %s', this.getBlockReference());

        const url = this.getIdentityUrl();
        const identity = await this._sendGET(url);

        console.log('Identity resolved: \n - System ID: %s\n - Instance ID: %s', identity.systemId, identity.instanceId);

        this.setIdentity(identity.systemId, identity.instanceId);
    }

    /**
     * Get port to listen on for current instance
     *
     * @param [portType {string}] defaults to "rest"
     * @return {Promise<string>}
     */
    async getServerPort(portType) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }
        const url = this.getProviderPort(portType);

        return await this._sendGET(url);
    }

    async getServerHost() {
        return KapetaClusterConfig.getClusterServiceHost();
    }

    /**
     * Register instance with cluster service
     *
     * @param {string} instanceHealthPath
     * @param {string} [portType="rest"] Defaults to "rest"
     * @return {Promise<string>}
     */
    async registerInstance(instanceHealthPath, portType) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }
        const url = this.getInstanceUrl();
        await this._sendRequest({
            url,
            method: 'PUT',
            headers: {
                'Content-Type':'application/json'
            },
            body: JSON.stringify({
                pid: process.pid,
                health: instanceHealthPath,
                portType
            })
        });

        const exitHandler = async () => {
            await provider.instanceStopped();
            process.exit();
        };

        process.on('SIGINT', exitHandler);
        process.on('SIGTERM', exitHandler);
    }

    async instanceStopped() {
        const url = this.getInstanceUrl();
        return this._sendRequest({
            url,
            method: 'DELETE'
        });
    }

    async getServiceAddress(resourceName, portType) {
        const url = this.getServiceClientUrl(resourceName, portType);

        return await this._sendGET(url);
    }

    async getResourceInfo(resourceType, portType, resourceName) {
        const url = this.getResourceInfoUrl(resourceType, portType, resourceName);

        return await this._sendGET(url);
    }

    async load() {
        await this.getClusterConfig();
    }

    getProviderId() {
        return this.getClusterServiceBaseUrl();
    }

    getClusterConfig() {
        return KapetaClusterConfig.getClusterConfig();
    }

    getClusterServiceBaseUrl() {
        return KapetaClusterConfig.getClusterServiceAddress();
    }

    getInstanceUrl() {
        const subPath = `/instances`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    getConfigBaseUrl() {
        const subPath = `/config`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    getProviderPort(serviceType) {
        const subPath = `/provides/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getServiceClientUrl(resourceName, serviceType) {
        const subPath = `/consumes/${this.encode(resourceName)}/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getResourceInfoUrl(operatorType, portType, resourceName) {
        const subPath = `/consumes/resource/${this.encode(operatorType)}/${this.encode(portType)}/${this.encode(resourceName)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getIdentityUrl() {
        const subPath = `/identity`;
        return this.getConfigBaseUrl() + subPath;
    }

    encode(text) {
        return encodeURIComponent(text.toLowerCase())
    }



    /**
     * Send GET HTTP request to url
     *
     * @param url
     * @return {Promise<any>}
     * @protected
     */
    _sendGET(url) {
        const opts = {
            headers: {},
            url: url
        };

        return this._sendRequest(opts);
    }

    /**
     * Send GET HTTP request to url
     *
     * @param url
     * @return {Promise<any>}
     * @protected
     */
    _sendRequest(opts) {

        if (!opts.headers) {
            opts.headers = {};
        }

        opts.headers[HEADER_KAPETA_BLOCK] = this.getBlockReference();
        opts.headers[HEADER_KAPETA_SYSTEM] = this.getSystemId();
        opts.headers[HEADER_KAPETA_INSTANCE] = this.getInstanceId();


        return new Promise((resolve, reject) => {
            Request(opts, (err, response, body) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (response.statusCode > 399) {
                    reject(new Error('Request failed: ' + opts.url + ' - Status: ' + response.statusCode));
                    return;
                }

                let contentType = response.headers['content-type'] || 'text/plain';
                contentType = contentType.split(/;/)[0].trim();

                switch (contentType.toLowerCase()) {
                    case 'application/json':
                    case 'text/json':
                        resolve(JSON.parse(body));
                        break;

                    case 'application/yaml':
                    case 'text/yaml':
                        resolve(YAML.parse(body));
                        break;

                    default:
                        resolve(body);
                        break;
                }

            });
        });
    }
}


module.exports = LocalConfigProvider;
