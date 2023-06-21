import Request from 'request';
import _ from 'lodash';
import * as YAML from 'yaml';
import KapetaClusterConfig from '@kapeta/local-cluster-config';
import { AbstractConfigProvider } from './AbstractConfigProvider';
import { Identity, ResourceInfo } from '../types';

type RequestOptions = Request.CoreOptions & Request.RequiredUriUrl & Request.UrlOptions & Request.OptionsWithUrl;

const KAPETA_ENVIRONMENT_TYPE = 'KAPETA_ENVIRONMENT_TYPE';
const HEADER_KAPETA_BLOCK = 'X-Kapeta-Block';
const HEADER_KAPETA_SYSTEM = 'X-Kapeta-System';
const HEADER_KAPETA_INSTANCE = 'X-Kapeta-Instance';
const HEADER_KAPETA_ENVIRONMENT = 'X-Kapeta-Environment';
const DEFAULT_SERVER_PORT_TYPE = 'rest';

/**
 * Local config provider - used when running local kapeta clusters during development and testing.
 *
 * @implements {ConfigProvider}
 */
export class LocalConfigProvider extends AbstractConfigProvider {
    private _configuration: any;

    /**
     *
     * @param {string} blockRef
     * @param {string} systemId
     * @param {string} instanceId
     * @param {BlockDefinition} blockDefinition
     * @return {Promise<LocalConfigProvider>}
     */
    static async create(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        const configProvider = new LocalConfigProvider(blockRef, systemId, instanceId, blockDefinition);

        await configProvider.load();

        await configProvider.resolveIdentity();

        return configProvider;
    }

    constructor(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        super(blockRef, systemId, instanceId, blockDefinition);
        this._configuration = {};
    }

    /**
     * Resolve and verify system and instance id
     * @returns {Promise<void>}
     */
    async resolveIdentity() {
        console.log('Resolving identity for block: %s', this.getBlockReference());

        const url = this.getIdentityUrl();
        const identity = await this._sendGET<Identity>(url);

        if (!identity) {
            throw new Error('Failed to resolve identity');
        }

        console.log(
            'Identity resolved: \n - System ID: %s\n - Instance ID: %s',
            identity.systemId,
            identity.instanceId
        );

        this.setIdentity(identity.systemId, identity.instanceId);

        await this.loadConfiguration();
    }

    async loadConfiguration() {
        this._configuration = await this.getInstanceConfig();
        if (!this._configuration) {
            this._configuration = {};
        }
    }

    /**
     * Get port to listen on for current instance
     *
     */
    async getServerPort(portType: string = 'rest'): Promise<string> {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        if (process.env[`KAPETA_LOCAL_SERVER_PORT_${portType.toUpperCase()}`]) {
            return process.env[`KAPETA_LOCAL_SERVER_PORT_${portType.toUpperCase()}`]!;
        }

        const url = this.getProviderPort(portType);

        const port = await this._sendGET<string>(url);

        if (!port) {
            throw new Error(`Failed to resolve server port for type "${portType}"`);
        }

        return port;
    }

    async getServerHost() {
        if (process.env[`KAPETA_LOCAL_SERVER`]) {
            return process.env[`KAPETA_LOCAL_SERVER`];
        }
        //Locally it's always this
        return '127.0.0.1';
    }

    /**
     * Register instance with cluster service
     */
    async registerInstance(instanceHealthPath: string, portType: string = 'rest') {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }
        const url = this.getInstanceUrl();
        await this._sendRequest({
            url,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pid: process.pid,
                health: instanceHealthPath,
                portType,
            }),
        });

        const exitHandler = async () => {
            await this.instanceStopped();
            process.exit();
        };

        process.on('SIGINT', exitHandler);
        process.on('SIGTERM', exitHandler);
    }

    async instanceStopped() {
        const url = this.getInstanceUrl();
        return this._sendRequest({
            url,
            method: 'DELETE',
        });
    }

    async getServiceAddress(resourceName: string, portType: string) {
        const url = this.getServiceClientUrl(resourceName, portType);

        return await this._sendGET<string>(url);
    }

    async getResourceInfo(resourceType: string, portType: string, resourceName: string) {
        const url = this.getResourceInfoUrl(resourceType, portType, resourceName);

        return await this._sendGET<ResourceInfo>(url);
    }

    async getInstanceProviderUrl(instanceId: string, portType: string, resourceName: string) {
        const url = this.getInstanceProviderHostUrl(instanceId, portType, resourceName);

        return await this._sendGET<string>(url);
    }

    async getInstanceHost(instanceId: string) {
        const url = this.getInstanceHostUrl(instanceId);

        return await this._sendGET<string>(url);
    }

    async getInstanceConfig() {
        const url = this.getInstanceConfigUrl();

        return await this._sendGET<any>(url);
    }

    async load() {
        this.getClusterConfig();
    }

    getProviderId(): string {
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

    getInstanceConfigUrl() {
        const subPath = `/config/instance`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    getConfigBaseUrl() {
        const subPath = `/config`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    getProviderPort(serviceType: string) {
        const subPath = `/provides/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getServiceClientUrl(resourceName: string, serviceType: string) {
        const subPath = `/consumes/${this.encode(resourceName)}/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getResourceInfoUrl(operatorType: string, portType: string, resourceName: string) {
        const subPath = `/consumes/resource/${this.encode(operatorType)}/${this.encode(portType)}/${this.encode(
            resourceName
        )}`;
        return this.getConfigBaseUrl() + subPath;
    }

    getInstanceHostUrl(instanceId: string) {
        const subPath = [this.getSystemId(), instanceId, 'address', 'public'].map((v) => this.encode(v)).join('/');

        return this.getInstanceUrl() + '/' + subPath;
    }

    getInstanceProviderHostUrl(instanceId: string, portType: string, resourceName: string) {
        const subPath = [this.getSystemId(), instanceId, 'provider', portType, resourceName, 'address', 'public']
            .map((v) => this.encode(v))
            .join('/');

        return this.getInstanceUrl() + '/' + subPath;
    }

    getIdentityUrl() {
        const subPath = `/identity`;
        return this.getConfigBaseUrl() + subPath;
    }

    encode(text: string) {
        return encodeURIComponent(text.toLowerCase());
    }

    /**
     * Send GET HTTP request to url
     */
    private _sendGET<T>(url: string): Promise<T | null> {
        const opts = {
            headers: {},
            url: url,
        };

        return this._sendRequest(opts);
    }

    /**
     * Send GET HTTP request to url
     */
    private _sendRequest<T>(opts: RequestOptions): Promise<T | null> {
        if (!opts.headers) {
            opts.headers = {};
        }

        opts.headers[HEADER_KAPETA_ENVIRONMENT] = 'process';
        if (process.env[KAPETA_ENVIRONMENT_TYPE]) {
            opts.headers[HEADER_KAPETA_ENVIRONMENT] = process.env[KAPETA_ENVIRONMENT_TYPE];
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

                if (response.statusCode === 404) {
                    resolve(null);
                    return;
                }

                if (response.statusCode > 399) {
                    console.warn('Request failed: ' + opts.url + ' - Status: ' + response.statusCode, body);
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

    public getConfiguration<T>(path: string, defaultValue?: T): T {
        return _.get(this._configuration, path, defaultValue);
    }
}
