const _ = require('lodash');


/**
 * Base class for config providers
 *
 * @implements {ConfigProvider}
 */
class AbstractConfigProvider {

    constructor(blockRef, systemId, instanceId, blockDefinition) {
        this._blockRef = blockRef;
        this._systemId = systemId;
        this._instanceId = instanceId;
        this._blockDefinition = blockDefinition;
    }

    getBlockDefinition() {
        return this._blockDefinition;
    }

    getBlockReference() {
        return this._blockRef;
    }

    getSystemId() {
        return this._systemId;
    }

    getInstanceId() {
        return this._instanceId;
    }

    /**
     *
     * @param systemId
     * @param instanceId
     * @protected
     */
    setIdentity(systemId, instanceId) {
        this._systemId = systemId;
        this._instanceId = instanceId;
    }

    /**
     * Gets the primary server port for this service
     * @return {Promise<number>}
     */
    async getServerPort(portType) {
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
     * E.g.: getResourceInfo("kapeta/resource-type-postgresql" , "postgres");
     *
     * @param {string} resourceType
     * @param {string} portType
     * @param {string} resourceName
     * @return {Promise<ResourceInfo>}
     */
    async getResourceInfo(resourceType, portType, resourceName) {
        throw new Error('Method not implemented');
    }


    getProviderId() {
        throw new Error('Method not implemented');
    }

    getServerHost() {
        throw new Error('Method not implemented');
    }

    /**
     * Gets configuration value for a given object path
     * @abstract
     * @param {string} path object path in configuration - e.g. "some.nested.path"
     * @param {any} [defaultValue]
     * @return {Promise<any>}
     */
    getConfiguration(path, defaultValue) {
        throw new Error('Method not implemented');
    }
}


module.exports = AbstractConfigProvider;