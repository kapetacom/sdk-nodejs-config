const AbstractConfigProvider = require('./AbstractConfigProvider');
const Request = require('request');
const OS = require('os');
const Path = require('path');
const FS = require('fs');
const YAML = require('yaml');

const BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE = ".blockware/cluster-service.yml";
const BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT = "35100";

const CONFIG_CLUSTER_PORT = "cluster.port";

const HEADER_BLOCKWARE_SERVICE = "X-Blockware-Service";
const HEADER_BLOCKWARE_SYSTEM = "X-Blockware-System";

const SERVER_PORT_TYPE = "rest";

/**
 * Local config provider - used when running local blockware clusters during development and testing.
 */
class LocalConfigProvider extends AbstractConfigProvider {

    constructor(serviceName, systemId) {
        super(serviceName, systemId);

        this._clusterConfig = null;
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
        return {};
    }

    getClusterConfig() {
        if (this._clusterConfig != null) {
            return this._clusterConfig;
        }

        const userHomeDir = OS.homedir();

        const configFile = Path.join(userHomeDir, BLOCKWARE_CLUSTER_SERVICE_CONFIG_FILE);

        this._clusterConfig = {};

        if (!FS.existsSync(configFile)) {
            return clusterConfig;
        }

        const rawYAML = FS.readFileSync(configFile).toString();

        this._clusterConfig = YAML.parse(rawYAML);

        console.log('Read cluster config from file: %s', configFile);

        return this._clusterConfig;
    }

    getClusterServiceBaseUrl() {

        const clusterConfig = this.getClusterConfig();

        const clusterPort = this._getValue(clusterConfig, CONFIG_CLUSTER_PORT, BLOCKWARE_CLUSTER_SERVICE_DEFAULT_PORT);

        return 'http://localhost:' + clusterPort;
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