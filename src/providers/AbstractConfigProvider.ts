/**
 * Copyright 2023 Kapeta Inc.
 * SPDX-License-Identifier: MIT
 */

import { ConfigProvider, ResourceInfo } from '../types';

/**
 * Base class for config providers
 *
 */
export abstract class AbstractConfigProvider implements ConfigProvider {
    private readonly _blockRef: any;
    private readonly _blockDefinition: object;
    private _systemId: string;
    private _instanceId: string;

    constructor(blockRef: string, systemId: string, instanceId: string, blockDefinition: object) {
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

    setIdentity(systemId: string, instanceId: string) {
        this._systemId = systemId;
        this._instanceId = instanceId;
    }

    abstract getInstanceHost(instanceId: string): Promise<string | null>;

    abstract getProviderId(): string;

    abstract getResourceInfo(
        resourceType: string,
        portType: string,
        resourceName: string
    ): Promise<ResourceInfo | null>;

    abstract getServerHost(): Promise<string>;

    abstract getServerPort(portType?: string): Promise<string>;

    abstract getServiceAddress(serviceName: string, portType: string): Promise<string | null>;

    abstract get<T = any>(path: string): T | undefined;

    abstract getOrDefault<T = any>(path: string, defaultValue: T): T;
}
