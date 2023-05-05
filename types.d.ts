
export default class Config {
    static onReady(callback:(provider:ConfigProvider) => void);
    static init(blockDir:string, healthEndpoint:string, portType:string):Promise<ConfigProvider>
}

declare interface ResourceInfo {
    host: string,
    port: string|number,
    type: string,
    protocol: string,
    options?: {
        [key:string]:string
    },
    credentials?: {
        [key:string]:string
    }
}

declare interface ConfigProvider {

    /**
     * Get block definition
     */
    getBlockDefinition():any;

    /**
     * Gets block reference id
     */
    getBlockReference():string;

    /**
     * Gets current system id
     */
    getSystemId():string;

    /**
     * Gets current instance id
     */
    getInstanceId():string;

    /**
     * Get local port to listen on for current process and port type
     *
     * @param {string} [portType="rest"]
     */
    getServerPort(portType?:string):Promise<number>;

    /**
     * Get remote base url for service with given name and port type
     *
     * @param {string} serviceName
     * @param {string} portType E.g. "web" or "rest"
     */
    getServiceAddress(serviceName:string, portType:string):Promise<string>

    /**
     *
     * @param {string} resourceType
     * @param {string} portType
     * @param {string} resourceName
     */
    getResourceInfo(resourceType:string, portType:string, resourceName:string):Promise<ResourceInfo>


    /**
     * Get host for current process
     */
    getServerHost():Promise<string>

    /**
     * Get identifier for the config provider
     */
    getProviderId():string

    /**
     * Get configuration from path
     */
    getConfiguration<T>(path:string, defaultValue?:T):T
}