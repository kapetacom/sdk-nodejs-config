# [2.0.0](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.1.3...v2.0.0) (2023-12-12)


### Features

* Simplify API and add support for getting typed config objects ([#12](https://github.com/kapetacom/sdk-nodejs-config/issues/12)) ([3b6086e](https://github.com/kapetacom/sdk-nodejs-config/commit/3b6086ef4c8fc05b249941aa7c810cbf28cdd321))


### BREAKING CHANGES

* Removed health endpoint reporting

## [1.1.3](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.1.2...v1.1.3) (2023-10-17)

### Bug Fixes

-   Cleanup ([#10](https://github.com/kapetacom/sdk-nodejs-config/issues/10)) ([18bbdbe](https://github.com/kapetacom/sdk-nodejs-config/commit/18bbdbefe6a11bfad4a6e564f3f4b5e846ef990d))

## [1.1.2](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.1.1...v1.1.2) (2023-09-02)

### Bug Fixes

-   adding replicaSet to ResourceInfo ([46b10b2](https://github.com/kapetacom/sdk-nodejs-config/commit/46b10b2c5bb81dbce271026d50e0c03f99774124))

## [1.1.1](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.1.0...v1.1.1) (2023-06-30)

### Bug Fixes

-   Implemented the ability to get public host in k8s and docker compose ([#7](https://github.com/kapetacom/sdk-nodejs-config/issues/7)) ([f43587b](https://github.com/kapetacom/sdk-nodejs-config/commit/f43587b24adf672f7e506222fbdd4411b4a3d5e3))

# [1.1.0](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.0.4...v1.1.0) (2023-06-21)

### Features

-   Implemented proper support for getting public address of instances ([#6](https://github.com/kapetacom/sdk-nodejs-config/issues/6)) ([ffd6525](https://github.com/kapetacom/sdk-nodejs-config/commit/ffd65250ba1d9334c1c306744c1a85cc5c9066a8))

## [1.0.4](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.0.3...v1.0.4) (2023-06-11)

### Bug Fixes

-   Default to commonjs ([08d2202](https://github.com/kapetacom/sdk-nodejs-config/commit/08d2202e425fee05faa0bf8a16c4cf4bc93d9c21))

## [1.0.3](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.0.2...v1.0.3) (2023-06-09)

### Bug Fixes

-   Supprt mixed modules ([30a96d9](https://github.com/kapetacom/sdk-nodejs-config/commit/30a96d952227948c4d96ed2238374d60e483c9c8))

## [1.0.2](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.0.1...v1.0.2) (2023-06-09)

### Bug Fixes

-   Return type for resource info was wrong ([cef2b2d](https://github.com/kapetacom/sdk-nodejs-config/commit/cef2b2dccdbde91d4b3fff1c72c44d67f67b7a43))

## [1.0.1](https://github.com/kapetacom/sdk-nodejs-config/compare/v1.0.0...v1.0.1) (2023-06-09)

### Bug Fixes

-   Add README ([1e5bde1](https://github.com/kapetacom/sdk-nodejs-config/commit/1e5bde178ae21d80c3c9d502b24f21a13964e198))

# 1.0.0 (2023-06-09)

### Bug Fixes

-   check if port is set using env ([d9ebbf2](https://github.com/kapetacom/sdk-nodejs-config/commit/d9ebbf2a5b574b2cebbffbd6cf1e87e3b6fbc659))

### Features

-   Adding a docker compose config provider ([12662af](https://github.com/kapetacom/sdk-nodejs-config/commit/12662af44be641765d6d9e021d7fc2957b9e3166))
-   Adds instance config to local and k8s config providers ([#3](https://github.com/kapetacom/sdk-nodejs-config/issues/3)) ([de1ccf9](https://github.com/kapetacom/sdk-nodejs-config/commit/de1ccf997dac26a6cb81b7985436369fc8713cc4))
-   Rewrote to TS and publish ESM and CJS modules ([#5](https://github.com/kapetacom/sdk-nodejs-config/issues/5)) ([db67949](https://github.com/kapetacom/sdk-nodejs-config/commit/db67949277e72d3cd95d0d421f4e3063ade335e6))
