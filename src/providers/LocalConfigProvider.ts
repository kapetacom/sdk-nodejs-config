/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */

import Request from 'request';
import _ from 'lodash';
import * as YAML from 'yaml';
import KapetaClusterConfig from '@kapeta/local-cluster-config';
import { AbstractConfigProvider } from './AbstractConfigProvider';
import {
    BlockInstanceDetails,
    DefaultCredentials,
    DefaultResourceOptions,
    Identity,
    InstanceOperator,
    ResourceInfo
} from '../types';
import {BlockDefinition, Plan} from '@kapeta/schemas';

type RequestOptions = Request.CoreOptions & Request.RequiredUriUrl & Request.UrlOptions & Request.OptionsWithUrl;

const KAPETA_ENVIRONMENT_TYPE = 'KAPETA_ENVIRONMENT_TYPE';
const HEADER_KAPETA_BLOCK = 'X-Kapeta-Block';
const HEADER_KAPETA_SYSTEM = 'X-Kapeta-System';
const HEADER_KAPETA_INSTANCE = 'X-Kapeta-Instance';
const HEADER_KAPETA_ENVIRONMENT = 'X-Kapeta-Environment';
const DEFAULT_SERVER_PORT_TYPE = 'rest';

interface AssetWrapper<T> {
    data:T
}

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
     */
    public async resolveIdentity() {
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

    public async loadConfiguration() {
        this._configuration = await this.getInstanceConfig();
        if (!this._configuration) {
            this._configuration = {};
        }
    }

    /**
     * Get port to listen on for current instance
     *
     */
    public async getServerPort(portType: string = 'rest'): Promise<string> {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        if (process.env[`KAPETA_LOCAL_SERVER_PORT_${portType.toUpperCase()}`]) {
            return process.env[`KAPETA_LOCAL_SERVER_PORT_${portType.toUpperCase()}`]!;
        }

        const url = this.getProviderPortUrl(portType);

        const port = await this._sendGET<string>(url);

        if (!port) {
            throw new Error(`Failed to resolve server port for type "${portType}"`);
        }

        return port;
    }

    public async getServerHost() {
        if (process.env[`KAPETA_LOCAL_SERVER`]) {
            return process.env[`KAPETA_LOCAL_SERVER`];
        }
        //Locally it's always this
        return '127.0.0.1';
    }

    /**
     * Register instance with cluster service
     */
    public async registerInstance() {
        const url = this.getInstanceUrl();
        await this._sendRequest({
            url,
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                pid: process.pid,
            }),
        });

        const exitHandler = async () => {
            await this.instanceStopped();
            process.exit();
        };

        process.on('SIGINT', exitHandler);
        process.on('SIGTERM', exitHandler);
    }

    public async instanceStopped() {
        const url = this.getInstanceUrl();
        return this._sendRequest({
            url,
            method: 'DELETE',
        });
    }

    public async getServiceAddress(resourceName: string, portType: string) {
        const url = this.getServiceClientUrl(resourceName, portType);

        return await this._sendGET<string>(url);
    }

    public async getResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials>(resourceType: string, portType: string, resourceName: string, ensure:boolean = true) {
        const url = this.getResourceInfoUrl(resourceType, portType, resourceName, ensure);

        return await this._sendGET<ResourceInfo<Options, Credentials>>(url);
    }

    public async getInstanceHost(instanceId: string) {
        const url = this.getInstanceHostUrl(instanceId);

        return await this._sendGET<string>(url);
    }

    public async getInstanceConfig() {
        const url = this.getInstanceConfigUrl();

        return await this._sendGET<any>(url);
    }

    public async getInstanceOperator<Options = any, Credentials = DefaultCredentials>(instanceId: string, ensure:boolean = true) {
        const url = this.getInstanceOperatorUrl(instanceId, ensure);
        return await this._sendGET<InstanceOperator<Options, Credentials>>(url);
    }

    public async getInstanceForConsumer<BlockType = BlockDefinition>(resourceName: string): Promise<BlockInstanceDetails<BlockType> | null> {
        const plan = await this.getPlan();
        if (!plan) {
            throw new Error('Could not find plan');
        }
        const instanceId = this.getInstanceId();
        const connection = plan.spec.connections
            .find(connection =>
                connection.consumer.blockId === instanceId &&
                connection.consumer.resourceName === resourceName);

        if (!connection) {
            throw new Error(`Could not find connection for consumer ${resourceName}`);
        }

        const instance = plan.spec.blocks.find(b => b.id === connection.provider.blockId);

        if (!instance) {
            throw new Error(`Could not find instance ${connection.provider.blockId} in plan`);
        }

        const block = await this.getBlock(instance.block.ref);

        if (!block) {
            throw new Error(`Could not find block ${instance.block.ref} in plan`);
        }

        return {
            instanceId: connection.provider.blockId,
            connections: [connection],
            block: block as BlockType
        }
    }

    public async getInstancesForProvider<BlockType = BlockDefinition>(resourceName: string): Promise<BlockInstanceDetails<BlockType>[]> {
        const plan = await this.getPlan();
        if (!plan) {
            throw new Error('Could not find plan');
        }
        const instanceId = this.getInstanceId();

        const blockDetails:{[key:string]:BlockInstanceDetails<BlockType>} = {};
        const connections = plan.spec.connections
            .filter(connection =>
                connection.provider.blockId === instanceId &&
                connection.provider.resourceName === resourceName);


        for(const connection of connections) {
            const blockInstanceId = connection.consumer.blockId;
            if (blockDetails[blockInstanceId]) {
                blockDetails[blockInstanceId].connections.push(connection);
                continue;
            }

            const instance = plan.spec.blocks.find(b => b.id === blockInstanceId);
            if (!instance) {
                throw new Error(`Could not find instance ${blockInstanceId} in plan`);
            }

            const block = await this.getBlock(instance.block.ref);
            if (!block) {
                throw new Error(`Could not find block ${instance.block.ref} in plan`);
            }

            blockDetails[blockInstanceId] = {
                instanceId: blockInstanceId,
                connections: [connection],
                block: block as BlockType
            };
        }

        return Object.values(blockDetails);
    }

    public async getPlan() {
        const url = this.getAssetReadUrl(this.getSystemId());
        const wrapper =  await this._sendGET<AssetWrapper<Plan>>(url);
        if (!wrapper) {
            return null;
        }
        return wrapper.data;
    }

    public async getBlock(ref:string) {
        const url = this.getAssetReadUrl(ref);
        const wrapper = await this._sendGET<AssetWrapper<BlockDefinition>>(url);
        if (!wrapper) {
            return null;
        }
        return wrapper.data;
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

    private getAssetReadUrl(ref:string) {
        const subPath = `/assets/read?ref=${encodeURIComponent(ref)}&ensure=false`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    private getInstanceUrl() {
        const subPath = `/instances`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    private getInstanceConfigUrl() {
        const subPath = `/config/instance`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    private getConfigBaseUrl() {
        const subPath = `/config`;
        return this.getClusterServiceBaseUrl() + subPath;
    }

    private getProviderPortUrl(serviceType: string) {
        const subPath = `/provides/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    private getServiceClientUrl(resourceName: string, serviceType: string) {
        const subPath = `/consumes/${this.encode(resourceName)}/${this.encode(serviceType)}`;
        return this.getConfigBaseUrl() + subPath;
    }

    private getResourceInfoUrl(operatorType: string, portType: string, resourceName: string, ensure:boolean) {
        const subPath = `/consumes/resource/${this.encode(operatorType)}/${this.encode(portType)}/${this.encode(
            resourceName
        )}?ensure=${ensure?'true':'false'}`;
        return this.getConfigBaseUrl() + subPath;
    }

    private getInstanceOperatorUrl(instanceId: string, ensure:boolean) {
        const subPath = `/operator/${this.encode(instanceId)}?ensure=${ensure?'true':'false'}`;
        return this.getConfigBaseUrl() + subPath;
    }

    private getInstanceHostUrl(instanceId: string) {
        const subPath = [this.getSystemId(), instanceId, 'address', 'public'].map((v) => this.encode(v)).join('/');

        return this.getInstanceUrl() + '/' + subPath;
    }

    private getIdentityUrl() {
        const subPath = `/identity`;
        return this.getConfigBaseUrl() + subPath;
    }

    private encode(text: string) {
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

        const promiseFunction = () => {
            return this._sendRequest<T>(opts);
        }

        return this.retryPromise(promiseFunction);
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

    public get<T = any>(path: string): T | undefined {
        return _.get(this._configuration, path);
    }

    public getOrDefault<T = any>(path: string, defaultValue: T): T {
        return _.get(this._configuration, path, defaultValue);
    }

    private retryPromise<T>(promiseFunction: () => Promise<T>, retries: number = 3): Promise<T | null> {
        return new Promise<T>((resolve, reject) => {
            function attempt() {
                promiseFunction()
                    .then(resolve)
                    .catch(error => {
                        if (retries > 0) {
                            retries--;
                            console.log(`Local cluster server disconnect. Retrying... ${retries} retries left.`);
                            attempt();
                        } else {
                            reject(error);
                        }
                    });
            }
            attempt();
        });
    }
}
