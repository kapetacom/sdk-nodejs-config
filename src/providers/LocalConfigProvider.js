const Request = require('request');
const YAML = require('yaml');
const BlockwareClusterConfig = require('@blockware/cluster-config');

const AbstractConfigProvider = require('./AbstractConfigProvider');

const HEADER_BLOCKWARE_BLOCK = "X-Blockware-Block";
const HEADER_BLOCKWARE_SYSTEM = "X-Blockware-System";
const HEADER_BLOCKWARE_INSTANCE = "X-Blockware-Instance";

const SERVER_PORT_TYPE = "rest";

/**
 * Local config provider - used when running local blockware clusters during development and testing.
 */
class LocalConfigProvider extends AbstractConfigProvider {

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

    async getServerPort() {
        const url = this.getProviderPort(SERVER_PORT_TYPE);

        return await this._sendGET(url);
    }

    async getServiceAddress(resourceName, portType) {
        const url = this.getServiceClientUrl(resourceName, portType);

        return await this._sendGET(url);
    }

    async getResourceInfo(resourceType, portType, resourceName) {
        const url = this.getResourceInfoUrl(resourceType, portType, resourceName);

        return await this._sendGET(url);
    }

    /**
     * Send GET HTTP request to url
     *
     * @param url
     * @return {Promise<string>}
     * @private
     */
    _sendGET(url) {
        const opts = {
            headers: {},
            url: url
        };

        opts.headers[HEADER_BLOCKWARE_BLOCK] = this.getBlockReference();
        opts.headers[HEADER_BLOCKWARE_SYSTEM] = this.getSystemId();
        opts.headers[HEADER_BLOCKWARE_INSTANCE] = this.getInstanceId();


        return new Promise((resolve, reject) => {
            Request(opts, (err, response, body) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (response.statusCode > 399) {
                    reject(new Error('Request failed: ' + url + ' - Status: ' + response.statusCode));
                    return;
                }

                let contentType = response.headers['content-type'] || 'text/plain';
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

    async load() {
        await this.getClusterConfig();
    }

    getProviderId() {
        return this.getClusterServiceBaseUrl();
    }

    getClusterConfig() {
        return BlockwareClusterConfig.getClusterConfig();
    }

    getClusterServiceBaseUrl() {
        return BlockwareClusterConfig.getClusterServiceAddress();
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
}


module.exports = LocalConfigProvider;