const _ = require('lodash');
const fs = require('fs');

const AbstractConfigProvider = require('./AbstractConfigProvider');

const DEFAULT_SERVER_PORT_TYPE = "rest";

function toEnvName(name) {
    return name.toUpperCase()
        .trim()
        .replace(/[.,-]/g,'_');
}

/**
 * Docker compose config provider - used when running kapeta clusters within Docker compose
 *
 * @implements {ConfigProvider}
 */
class DockerComposeConfigProvider extends AbstractConfigProvider {

    /**
     *
     * @param {string} blockRef
     * @param {string} systemId
     * @param {string} instanceId
     * @param {BlockDefinition} blockDefinition
     * @return {Promise<DockerComposeConfigProvider>}
     */
    static async create(blockRef, systemId, instanceId, blockDefinition) {
        return new DockerComposeConfigProvider(blockRef, systemId, instanceId, blockDefinition);
    }

    constructor(blockRef, systemId, instanceId, blockDefinition) {
        super(blockRef, systemId, instanceId, blockDefinition);
	this.addPropertiesToEnv('/run/secrets/kapeta/kapeta.env')
        this._configuration = null;
    }

    /**
     * Get port to listen on for current instance
     *
     */
    async getServerPort(portType) {
        if (!portType) {
            portType = DEFAULT_SERVER_PORT_TYPE;
        }

        const envVar = `KAPETA_PROVIDER_PORT_${toEnvName(portType)}`
        if (envVar in process.env) {
            return parseInt(process.env[envVar]);
        }

        return 80; //We default to port 80
    }

    async getServiceAddress(resourceName, portType) {
        const envVar = `KAPETA_CONSUMER_SERVICE_${toEnvName(resourceName)}_${toEnvName(portType)}`
        if (envVar in process.env) {
            return process.env[envVar];
        }

        throw new Error(`Missing environment variable for internal resource: ${envVar}`);
    }

    /*
        * Get the resource info as an object for a given resource, by looping through all env vars and finding the one that has the prefix
        * @param {string} prefix
        * @returns {object}
    */ 
    getEnvVarsWithPrefix(prefix) {
        const result = {};
        if(!prefix.endsWith('_')) {
            prefix = prefix + '_';
        }
        for (let key in process.env) {
          if (key.startsWith(prefix)) {
            const parts = key.split('_');
      
            // Skip the prefix
            for(let i = 1; i < prefix.split('_').length; i++) {
                parts.shift();
            }
      
            // Traverse the object using the remaining parts
            let obj = result;
            while (parts.length > 1) {
              const part = parts.shift().toLowerCase();
              if (!obj[part]) {
                obj[part] = {};
              }
              obj = obj[part];
            }
      
            // Set the value of the leaf object
            obj[parts[0].toLocaleLowerCase()] = process.env[key];
          }
        }
      
        return result;
      }

    addPropertiesToEnv(filepath) {
	try {
	    const properties = fs.readFileSync(filepath, 'utf-8').split('\n');

	    for (let i = 0; i < properties.length; i++) {
		const property = properties[i].trim();

		// Ignore comments and empty lines
		if (property.startsWith('#') || property === '') {
		    continue;
		}

		const [key, value] = property.split('=');
		process.env[key] = value;
	    }
	} catch (err) {
	    if (err.code === 'ENOENT') {
		console.log(`Default Kapeta env file ${filepath} not found. Skipping...`);
	    } else {
		throw err;
	    }
	}
    }

    getResourceInfo(resourceType, portType, resourceName) {
        const envVar = `KAPETA_CONSUMER_RESOURCE_${toEnvName(resourceName)}_${toEnvName(portType)}`
        // loop through all env vars and find the one that has the envVar prefix
        const obj = this.getEnvVarsWithPrefix(envVar);
        if (obj) {
            return obj;
        }

        throw new Error(`Missing environment variable for operator resource: ${envVar}`);
    }

    async getServerHost() {
        const envVar = `KAPETA_PROVIDER_HOST`
        if (envVar in process.env) {
            return process.env[envVar];
        }

        //Any host within docker container
        return '0.0.0.0';
    }

    getProviderId() {
        return 'docker-compose';
    }

    getConfiguration(path, defaultValue) {
        if (!this._configuration) {
            const envVar = `KAPETA_INSTANCE_CONFIG`
            if (envVar in process.env) {
                try {
                    this._configuration = JSON.parse(process.env[envVar]);
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
}


module.exports = DockerComposeConfigProvider;
