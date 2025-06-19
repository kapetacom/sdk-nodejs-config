/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */

import {
    BlockInstanceDetails,
    ConfigProvider,
    DefaultCredentials,
    DefaultResourceOptions,
    InstanceOperator,
    ResourceInfo,
} from '../types';

import { BlockDefinition } from '@kapeta/schemas';
import FS from 'node:fs/promises';
import zlib from 'node:zlib';

export const KAPETA_CONFIG_PATH = 'KAPETA_CONFIG_PATH';

/**
 * Base class for config providers
 *
 */
export abstract class AbstractConfigProvider implements ConfigProvider {
    private readonly _blockRef: any;
    private readonly _blockDefinition: object;
    private _systemId: string;
    private _instanceId: string;
    private _environmentConfig: { [key: string]: string } = {};

    constructor(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
        this._blockRef = blockRef;
        this._systemId = systemId;
        this._instanceId = instanceId;
        this._blockDefinition = blockDefinition;
    }

    protected async readLocalConfig() {
        if (this.hasEnvVar(KAPETA_CONFIG_PATH)) {
            const configPath = this.getEnvVar(KAPETA_CONFIG_PATH);
            const configBuf = await FS.readFile(configPath);
            if (configPath.endsWith('.gz')) {
                const arrayBuffer = configBuf.buffer.slice(
                    configBuf.byteOffset,
                    configBuf.byteOffset + configBuf.byteLength
                ) as ArrayBuffer;
                const config = zlib.gunzipSync(arrayBuffer).toString('utf-8');
                this._environmentConfig = JSON.parse(config);
            } else {
                this._environmentConfig = JSON.parse(configBuf.toString('utf-8'));
            }
        }
    }

    protected hasEnvVar(envVar: string): boolean {
        return envVar in process.env || envVar in this._environmentConfig;
    }

    protected getEnvVar(envVar: string): string {
        if (envVar in process.env) {
            return process.env[envVar]!;
        }
        if (envVar in this._environmentConfig) {
            return this._environmentConfig[envVar];
        }
        throw new Error(`Missing environment variable: ${envVar}`);
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

    setIdentity(systemId: string, instanceId: string) {
        this._systemId = systemId;
        this._instanceId = instanceId;
    }

    abstract getInstanceHost(instanceId: string): Promise<string | null>;

    abstract getProviderId(): string;

    abstract getResourceInfo<Options = DefaultResourceOptions, Credentials = DefaultCredentials>(
        resourceType: string,
        portType: string,
        resourceName: string
    ): Promise<ResourceInfo<Options, Credentials> | null>;

    abstract getServerHost(): Promise<string>;

    abstract getServerPort(portType?: string): Promise<string>;

    abstract getServiceAddress(serviceName: string, portType: string): Promise<string | null>;

    abstract get<T = any>(path: string): T | undefined;

    abstract getOrDefault<T = any>(path: string, defaultValue: T): T;

    abstract getInstanceForConsumer<BlockType = BlockDefinition>(
        resourceName: string
    ): Promise<BlockInstanceDetails<BlockType> | null>;

    abstract getInstanceOperator<Options = any, Credentials = DefaultCredentials>(
        instanceId: string
    ): Promise<InstanceOperator<Options, Credentials> | null>;

    abstract getInstancesForProvider<BlockType = BlockDefinition>(
        resourceName: string
    ): Promise<BlockInstanceDetails<BlockType>[]>;
}
