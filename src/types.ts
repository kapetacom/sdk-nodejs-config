export interface InstanceValue {
    id: string;
}

export interface InstanceProviderValue {
    id: string;
    portType: string;
    resourceName: string;
}

export interface Identity {
    systemId: string;
    instanceId: string;
}

export interface ResourceInfo {
    host: string;
    port: string | number;
    type: string;
    protocol: string;
    options?: {
        [key: string]: string;
    };
    credentials?: {
        [key: string]: string;
    };
}

export interface ConfigProvider {
    /**
     * Get block definition
     */
    getBlockDefinition(): any;

    /**
     * Gets block reference id
     */
    getBlockReference(): string;

    /**
     * Gets current system id
     */
    getSystemId(): string;

    /**
     * Gets current instance id
     */
    getInstanceId(): string;

    /**
     * Get local port to listen on for current process and port type
     *
     * @param {string} [portType="rest"]
     */
    getServerPort(portType?: string): Promise<string>;

    /**
     * Get remote base url for service with given name and port type
     *
     * @param {string} serviceName
     * @param {string} portType E.g. "web" or "rest"
     */
    getServiceAddress(serviceName: string, portType: string): Promise<string | null>;

    /**
     * Get resource info for given resource type, port type and resource name
     */
    getResourceInfo(resourceType: string, portType: string, resourceName: string): Promise<ResourceInfo | null>;

    /**
     * Get hostname and port for instance
     */
    getInstanceHost(instanceId: string): Promise<string | null>;

    /**
     * Get host for current process
     */
    getServerHost(): Promise<string>;

    /**
     * Get identifier for the config provider
     */
    getProviderId(): string;

    /**
     * Get configuration value from object path. E.g. "SomeConfig.fieldName"
     */
    getConfiguration<T>(path: string, defaultValue?: T): T | undefined;
}
