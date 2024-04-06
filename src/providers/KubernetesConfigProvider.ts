/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
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
import FS from 'node:fs/promises'
import YAML from "yaml";

const DEFAULT_SERVER_PORT_TYPE = 'rest';
const MOUNTED_CONFIG_YML = '/kapeta/deployment.yml';

function toEnvName(name: string) {
    return name.toUpperCase().trim().replace(/[.,-]/g, '_');
}

/**
 * Kubernetes config provider - used when running kapeta clusters within kubernetes
 *
 * @implements {ConfigProvider}
 */
export class KubernetesConfigProvider extends AbstractConfigProvider {
    private _configuration: any;
    private _instanceHosts: any;

    /**
     *
     */
    static async create(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        const config = new KubernetesConfigProvider(blockRef, systemId, instanceId, blockDefinition);
        await config.readLocalConfig();
        return config;
    }

    constructor(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        super(blockRef, systemId, instanceId, blockDefinition);

        this._configuration = null;
    }


    /**
     * Get port to listen on for current instance
     *
     */
    async getServerPort(portType?: string) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        const envVar = `KAPETA_PROVIDER_PORT_${toEnvName(portType)}`;
        if (this.hasEnvVar(envVar)) {
            return this.getEnvVar(envVar);
        }

        return '80'; //We default to port 80
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`;
        if (this.hasEnvVar(envVar)) {
            return this.getEnvVar(envVar);
        }

        //Any host within docker container
        return '0.0.0.0';
    }

    async getServiceAddress(resourceName: string, portType: string) {
        const envVar = `KAPETA_CONSUMER_SERVICE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        if (this.hasEnvVar(envVar)) {
            return this.getEnvVar(envVar);
        }

        throw new Error(`Missing environment variable for internal resource: ${envVar}`);
    }

    async getResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials>(resourceType: string, portType: string, resourceName: string) {
        const envVar = `KAPETA_CONSUMER_RESOURCE_${toEnvName(resourceName)}_${toEnvName(portType)}`;
        if (this.hasEnvVar(envVar)) {
            return JSON.parse(this.getEnvVar(envVar)) as ResourceInfo<Options, Credentials>;
        }

        throw new Error(`Missing environment variable for operator resource: ${envVar}`);
    }

    public async getInstanceOperator<Options = any, Credentials = DefaultCredentials>(instanceId: string): Promise<InstanceOperator<Options, Credentials> | null> {
        const envVar = `KAPETA_INSTANCE_OPERATOR_${toEnvName(instanceId)}`;
        if (this.hasEnvVar(envVar)) {
            return JSON.parse(this.getEnvVar(envVar)) as InstanceOperator<Options, Credentials>;
        }

        throw new Error(`Missing environment variable for operator instance: ${envVar}`);
    }

    public async getInstanceForConsumer<BlockType = BlockDefinition>(resourceName: string): Promise<BlockInstanceDetails<BlockType> | null> {
        const envVar = `KAPETA_INSTANCE_FOR_CONSUMER_${toEnvName(resourceName)}`;

        if (this.hasEnvVar(envVar)) {
            return JSON.parse(this.getEnvVar(envVar)) as BlockInstanceDetails<BlockType>;
        }

        const instanceId = this.getInstanceId();
        const deployment = await this.getDeployment();
        const connection = deployment.spec.network.find((network) =>
            network.consumer.id === instanceId &&
            network.consumer.resource === resourceName);

        if (!connection) {
            throw new Error(`Could not find connection for consumer ${resourceName}`);
        }

        const instance = deployment.spec.services.find(s => s.id === connection.consumer.id);

        if (!instance) {
            throw new Error(`Could not find instance ${connection.consumer.id} in deployment`);
        }

        return  {
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
        }

    }

    public async getInstancesForProvider<BlockType = BlockDefinition>(resourceName: string): Promise<BlockInstanceDetails<BlockType>[]> {
        const envVar = `KAPETA_INSTANCES_FOR_PROVIDER_${toEnvName(resourceName)}`;
        if (this.hasEnvVar(envVar)) {
            return JSON.parse(this.getEnvVar(envVar)) as BlockInstanceDetails<BlockType>[];
        }

        const instanceId = this.getInstanceId();
        const deployment = await this.getDeployment();
        const connections = deployment.spec.network.filter((network) =>
            network.provider.id === instanceId &&
            network.provider.resourceName === resourceName);

        const blockDetails: { [key: string]: BlockInstanceDetails<BlockType> } = {};

        for (const connection of connections) {
            const instance = deployment.spec.services.find(s => s.id === connection.consumer.id);

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
            }
        }

        return Object.values(blockDetails);
    }

    public async getDeployment(): Promise<Deployment> {
        try {
            const yml = await FS.readFile(MOUNTED_CONFIG_YML);
            return YAML.parse(yml.toString()) as Deployment;
        } catch (e) {
            throw new Error(`Failed to read deployment from mounted file: ${MOUNTED_CONFIG_YML}`);
        }
    }

    getProviderId() {
        return 'kubernetes';
    }

    private getConfiguration<T>(path: string, defaultValue?: T): T | undefined {
        if (!this._configuration) {
            const envVar = `KAPETA_INSTANCE_CONFIG`;
            if (this.hasEnvVar(envVar)) {
                try {
                    this._configuration = JSON.parse(this.getEnvVar(envVar));
                } catch (e) {
                    throw new Error(`Invalid JSON in environment variable: ${envVar}`);
                }
            } else {
                console.warn(`Missing environment variable for instance configuration: ${envVar}`);
                return defaultValue;
            }

            if (!this._configuration) {
                this._configuration = {};
            }
        }

        return _.get(this._configuration, path, defaultValue);
    }

    public get<T = any>(path: string): T | undefined {
        return this.getConfiguration(path);
    }

    public getOrDefault<T = any>(path: string, defaultValue: T): T {
        return this.getConfiguration(path, defaultValue) as T;
    }

    async getInstanceHost(instanceId: string): Promise<string> {
        if (!this._instanceHosts) {
            if (this.hasEnvVar('KAPETA_BLOCK_HOSTS')) {
                try {
                    this._instanceHosts = JSON.parse(this.getEnvVar('KAPETA_BLOCK_HOSTS'));
                } catch (e) {
                    throw new Error(`Invalid JSON in environment variable: KAPETA_BLOCK_HOSTS`);
                }
            } else {
                throw new Error('Environment variable KAPETA_BLOCK_HOSTS not found. Could not resolve instance host');
            }
        }

        if (instanceId in this._instanceHosts) {
            return this._instanceHosts[instanceId];
        }

        throw new Error(`Unknown instance id when resolving host: ${instanceId}.`);
    }
}
