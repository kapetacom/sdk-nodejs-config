interface ResourceInfo {

    host: string;

    port: string;

    type: string;

    protocol: string;

    options: Record<string, Object>;

    credentials: Record<string, string>;
}

interface ConfigProvider {

    /**
     * Gets the primary server port for this service
     * @return {Promise<number>}
     */
    getServerPort();

    /**
     * Gets the remote address for a given service name and port type.
     *
     * E.g.: getServiceAddress("users" , "rest");
     *
     * @param {string} serviceName
     * @param {string} portType
     * @return {Promise<string>}
     */
    getServiceAddress(serviceName, portType);

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
    getResourceInfo(resourceType, portType);

    /**
     * Load configuration
     * @return {Promise<Map<string,any>>}
     */
    load();
}