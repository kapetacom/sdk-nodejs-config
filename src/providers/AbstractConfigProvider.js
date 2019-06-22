const _ = require('lodash');

class AbstractConfigProvider {

    constructor(serviceName, systemId) {
        this._serviceName = serviceName;
        this._systemId = systemId;
    }

    getServiceName() {
        return this._serviceName;
    }

    getSystemId() {
        return this._systemId;
    }

    /**
     * Gets the primary server port for this service
     * @return {Promise<number>}
     */
    async getServerPort() {
        throw new Error('Method not implemented');
    }

    /**
     * Gets the remote address for a given service name and port type.
     *
     * E.g.: getServiceAddress("users" , "rest");
     *
     * @param {string} serviceName
     * @param {string} portType
     * @return {Promise<string>}
     */
    async getServiceAddress(serviceName, portType) {
        throw new Error('Method not implemented');
    }

    /**
     * Gets resource information for a given resource type. This is used for getting non-block
     * dependency information such as databases, MQ's and more.
     *
     * E.g.: getResourceInfo("sqldb.blockware.com/v1/postgresql" , "postgres");
     *
     * @param {string} resourceType
     * @param {string} portType
     * @return {Promise<ResourceInfo>}
     */
    async getResourceInfo(resourceType, portType) {
        throw new Error('Method not implemented');
    }

    async load() {
        throw new Error('Method not implemented');
    }


    _getValue(map, path, defaultValue) {
        let out = _.get(map, path);
        if (out === undefined) {
            return defaultValue;
        }

        return out;
    }
}


module.exports = AbstractConfigProvider;