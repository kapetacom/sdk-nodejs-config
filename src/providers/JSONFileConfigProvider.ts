/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */

/**
 * JSON file config provider - reads config from a JSON file where env vars are keys
 */
import {AbstractConfigProvider} from './AbstractConfigProvider';
import _ from 'lodash';
import {
    BlockInstanceDetails,
    DefaultCredentials,
    DefaultResourceOptions,
    InstanceOperator,
    ResourceInfo
} from '../types';
import {BlockDefinition, Connection, Deployment} from "@kapeta/schemas";
import FS from 'node:fs/promises';
import Path from 'node:path';
import { parse as parseYAML } from 'yaml';

const DEFAULT_SERVER_PORT_TYPE = 'rest';
const DEFAULT_CONFIG_FILE = Path.join(process.cwd(), 'kapeta-config.json');

function toEnvName(name: string) {
    return name.toUpperCase().trim().replace(/[.,-]/g, '_');
}

export class JsonFileConfigProvider extends AbstractConfigProvider {
    private _configData: Record<string, any>;
    private _deployment: Deployment | null = null;
    private _instanceConfig: any = null;

    /**
     * Create a new JSON file config provider
     */
    static async create(
        blockRef: string, 
        systemId: string, 
        instanceId: string, 
        blockDefinition: object,
        configPath?: string
    ) {
        const config = new JsonFileConfigProvider(blockRef, systemId, instanceId, blockDefinition, configPath);
        await config.loadConfig();
        return config;
    }

    constructor(
        blockRef: string, 
        systemId: string, 
        instanceId: string, 
        blockDefinition: object, 
        private readonly configPath: string = DEFAULT_CONFIG_FILE
    ) {
        super(blockRef, systemId, instanceId, blockDefinition);
        this._configData = {};
    }

    private async loadConfig() {
        try {
            const data = await FS.readFile(this.configPath, 'utf-8');
            this._configData = JSON.parse(data);
            
            // Special handling for KAPETA_INSTANCE_CONFIG
            if (this._configData.KAPETA_INSTANCE_CONFIG && typeof this._configData.KAPETA_INSTANCE_CONFIG === 'string') {
                try {
                    this._instanceConfig = JSON.parse(this._configData.KAPETA_INSTANCE_CONFIG);
                } catch (e: any) {
                    console.warn(`Failed to parse KAPETA_INSTANCE_CONFIG: ${e.message}`);
                    this._instanceConfig = {};
                }
            } else {
                this._instanceConfig = this._configData.KAPETA_INSTANCE_CONFIG || {};
            }
        } catch (e: any) {
            throw new Error(`Failed to read or parse config file at ${this.configPath}: ${e.message}`);
        }
    }

    private getConfigValue(envVar: string): any {
        if (!(envVar in this._configData)) {
            throw new Error(`Configuration key ${envVar} not found in config file`);
        }
        return this._configData[envVar];
    }

    private getInstanceConfigValue<T>(path: string, defaultValue?: T): T | undefined {
        return _.get(this._instanceConfig, path, defaultValue);
    }

    async getServerPort(portType?: string) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        const envVar = `KAPETA_PROVIDER_PORT_${toEnvName(portType)}`;
        try {
            return this.getConfigValue(envVar);
        } catch (e) {
            return '80';
        }
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`;
        try {
            return this.getConfigValue(envVar);
        } catch (e) {
            return '0.0.0.0';
        }
    }

    async getServiceAddress(resourceName: string, portType: string) {
        const envVar = `KAPETA_CONSUMER_SERVICE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        return this.getConfigValue(envVar);
    }

    async getResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials>(
        resourceType: string,
        portType: string,
        resourceName: string
    ) {
        const envVar = `KAPETA_CONSUMER_RESOURCE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        return this.getConfigValue(envVar) as ResourceInfo<Options, Credentials>;
    }

    public async getInstanceOperator<Options = any, Credentials = DefaultCredentials>(
        instanceId: string
    ): Promise<InstanceOperator<Options, Credentials> | null> {
        const envVar = `KAPETA_INSTANCE_OPERATOR_${toEnvName(instanceId)}`;
        return this.getConfigValue(envVar) as InstanceOperator<Options, Credentials>;
    }

    public async getInstanceForConsumer<BlockType = BlockDefinition>(
        resourceName: string
    ): Promise<BlockInstanceDetails<BlockType> | null> {
        const envVar = `KAPETA_INSTANCE_FOR_CONSUMER_${toEnvName(resourceName)}`;

        try {
            return this.getConfigValue(envVar) as BlockInstanceDetails<BlockType>;
        } catch (e) {
            if (!this._deployment) {
                try {
                    const yml = await FS.readFile(this.configPath.replace('.json', '.yml'));
                    this._deployment = parseYAML(yml.toString()) as Deployment;
                } catch (err: any) {
                    throw new Error(`No consumer instance found in config and failed to read deployment file: ${err.message}`);
                }
            }

            const instanceId = this.getInstanceId();
            const connection = this._deployment.spec.network.find((network) =>
                network.consumer.id === instanceId &&
                network.consumer.resource === resourceName);

            if (!connection) {
                throw new Error(`Could not find connection for consumer ${resourceName}`);
            }

            const instance = this._deployment.spec.services.find(s => s.id === connection.consumer.id);

            if (!instance) {
                throw new Error(`Could not find instance ${connection.consumer.id} in deployment`);
            }

            return {
                instanceId: instance.id,
                block: instance.blockDefinition as BlockType,
                connections: [{
                    provider: {
                        resourceName: connection.provider.resource!,
                        blockId: connection.provider.id
                    },
                    consumer: {
                        resourceName: connection.consumer.resource!,
                        blockId: connection.consumer.id
                    },
                    port: connection.port
                }]
            };
        }
    }

    public async getInstancesForProvider<BlockType = BlockDefinition>(
        resourceName: string
    ): Promise<BlockInstanceDetails<BlockType>[]> {
        const envVar = `KAPETA_INSTANCES_FOR_PROVIDER_${toEnvName(resourceName)}`;
        try {
            return this.getConfigValue(envVar) as BlockInstanceDetails<BlockType>[];
        } catch (e) {
            if (!this._deployment) {
                try {
                    const yml = await FS.readFile(this.configPath.replace('.json', '.yml'));
                    this._deployment = parseYAML(yml.toString()) as Deployment;
                } catch (err: any) {
                    throw new Error(`No provider instances found in config and failed to read deployment file: ${err.message}`);
                }
            }

            const instanceId = this.getInstanceId();
            const connections = this._deployment.spec.network.filter((network) =>
                network.provider.id === instanceId &&
                network.provider.resourceName === resourceName);

            const blockDetails: { [key: string]: BlockInstanceDetails<BlockType> } = {};

            for (const connection of connections) {
                const instance = this._deployment.spec.services.find(s => s.id === connection.consumer.id);

                if (!instance) {
                    throw new Error(`Could not find instance ${connection.consumer.id} in deployment`);
                }

                const stdConnection: Connection = {
                    provider: {
                        resourceName: connection.provider.resource!,
                        blockId: connection.provider.id
                    },
                    consumer: {
                        resourceName: connection.consumer.resource!,
                        blockId: connection.consumer.id
                    },
                    port: connection.port
                };

                if (blockDetails[instance.id]) {
                    blockDetails[instance.id].connections.push(stdConnection);
                    continue;
                }

                blockDetails[instance.id] = {
                    instanceId: instance.id,
                    block: instance.blockDefinition as BlockType,
                    connections: [stdConnection]
                };
            }

            return Object.values(blockDetails);
        }
    }

    public async getDeployment(): Promise<Deployment> {
        if (this._deployment) {
            return this._deployment;
        }

        try {
            const ymlPath = this.configPath.replace('.json', '.yml');
            const yml = await FS.readFile(ymlPath);
            this._deployment = parseYAML(yml.toString()) as Deployment;
            return this._deployment;
        } catch (e: any ) {
            throw new Error(`Failed to read deployment from file: ${e.message}`);
        }
    }

    getProviderId() {
        return 'json-file';
    }

    public get<T = any>(path: string): T | undefined {
        const instanceValue = this.getInstanceConfigValue<T>(path);
        if (instanceValue !== undefined) {
            return instanceValue;
        }
        return _.get(this._configData, path);
    }

    public getOrDefault<T = any>(path: string, defaultValue: T): T {
        const instanceValue = this.getInstanceConfigValue<T>(path);
        if (instanceValue !== undefined) {
            return instanceValue;
        }
        return _.get(this._configData, path, defaultValue);
    }

    async getInstanceHost(instanceId: string): Promise<string> {
        const envVar = 'KAPETA_BLOCK_HOSTS';
        try {
            const hosts = this.getConfigValue(envVar);
            if (instanceId in hosts) {
                return hosts[instanceId];
            }
            throw new Error(`Unknown instance id when resolving host: ${instanceId}.`);
        } catch (e: any) {
            throw new Error(`Failed to resolve instance host for ${instanceId}: ${e.message}`);
        }
    }
}