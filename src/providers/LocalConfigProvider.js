const Request = require('request');
const BlockwareClusterConfig = require('@blockware/sdk-config');

const AbstractConfigProvider = require('./AbstractConfigProvider');

const HEADER_BLOCKWARE_SERVICE = "X-Blockware-Service";
const HEADER_BLOCKWARE_SYSTEM = "X-Blockware-System";

const SERVER_PORT_TYPE = "rest";

/**
 * Local config provider - used when running local blockware clusters during development and testing.
 */
class LocalConfigProvider extends AbstractConfigProvider {

    constructor(serviceName, systemId) {
        super(serviceName, systemId);
    }

    async getServerPort() {
        const url = this.getProviderPort(SERVER_PORT_TYPE);

        return await this._sendGET(url);
    }

    async getServiceAddress(serviceName, portType) {
        const url = this.getServiceClientUrl(serviceName, portType);

        return await this._sendGET(url);
    }

    async getResourceInfo(resourceType, portType) {
        const url = this.getResourceInfoUrl(resourceType, portType);

        const response = await this._sendGET(url);

        return JSON.parse(response);
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

        opts.headers[HEADER_BLOCKWARE_SERVICE] = this.getServiceName();
        opts.headers[HEADER_BLOCKWARE_SYSTEM] = this.getSystemId();

        return new Promise((resolve, reject) => {
            Request(opts, (err, response, body) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve(body);
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
        const subPath = `/config/${this.encode(this._serviceName)}`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    getProviderPort(serviceType) {
        const subPath = `/provides/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getServiceClientUrl(otherService, serviceType) {
        const subPath = `/consumes/${this.encode(otherService)}/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getResourceInfoUrl(operatorType, portType) {
        const subPath = `/consumes/resource/${this.encode(operatorType)}/${this.encode(portType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    encode(text) {
        return encodeURIComponent(text.toLowerCase())
    }
}


module.exports = LocalConfigProvider;