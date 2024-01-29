/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */
import {BlockDefinition, Connection} from "@kapeta/schemas";

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

export interface DefaultCredentials {
    username: string,
    password: string,
}

export interface DefaultResourceOptions {
    dbName: string
    fullName: string
    [key: string]: string
}

export interface InstanceOperator<Options = any,Credentials = DefaultCredentials> {
    protocol: string,
    hostname: string,
    port: number,
    path?: string,
    query?: string,
    hash?: string,
    credentials?: Credentials,
    options: Options
}

export interface BlockInstanceDetails<BlockType = BlockDefinition> {
    instanceId: string,
    block: BlockType,
    connections: Connection[]
}

export interface ResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials> {
    host: string;
    port: string | number;
    type: string;
    protocol: string;
    options?: Options;
    credentials?: Credentials;
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
    getResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials>(resourceType: string, portType: string, resourceName: string): Promise<ResourceInfo<Options,Credentials> | null>;

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
    getOrDefault<T = any>(path: string, defaultValue: T): T;

    get<T = any>(path: string): T | undefined;

    getInstanceOperator<Options = any,Credentials extends DefaultCredentials = DefaultCredentials>(instanceId: string): Promise<InstanceOperator<Options,Credentials>|null>

    getInstancesForProvider<BlockType = BlockDefinition>(resourceName:string): Promise<BlockInstanceDetails<BlockType>[]>

    getInstanceForConsumer<BlockType = BlockDefinition>(resourceName:string): Promise<BlockInstanceDetails<BlockType>|null>
}
