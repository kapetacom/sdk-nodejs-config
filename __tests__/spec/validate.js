const DockerComposeConfigProvider = require('../../src/providers/DockerComposeConfigProvider');
const { env } = require('process');

describe('test docker compose config provider', function () {
    it('should return an object based on the port type and resource ',() => {
        clearAllEnvs()
        env.KAPETA_CONSUMER_RESOURCE_MYKAFKA_KAFKA_HOST = 'kafka';
        env.KAPETA_CONSUMER_RESOURCE_MYKAFKA_KAFKA_PORT = '9092';

        let dcp = new DockerComposeConfigProvider('kafka', 'host', 'kafka', 'kafka');
        const result = dcp.getResourceInfo(null, 'kafka', 'mykafka')
        expect(result.host).toBe('kafka');
        expect(result.port).toBe('9092');
    })
})

describe('test getEnvVarsWithPrefix', function () {
    it('should return an object from _RESOURCE and down',() => {
        // clear all env vars
        clearAllEnvs()
        env.KAPETA_CONSUMER_RESOURCE_KAFKA_HOST = 'kafka';
        env.KAPETA_CONSUMER_RESOURCE_KAFKA_PORT = '9092';
        let prefix = 'KAPETA_';
        let res = new DockerComposeConfigProvider('kafka', 'host', 'kafka', 'kafka').getEnvVarsWithPrefix(prefix);
        expect(res.consumer.resource.kafka.host).toBe("kafka");
        expect(res.consumer.resource.kafka.port).toBe("9092");
    })

    it('shoud work with a multi underscore prefix',() => {
        clearAllEnvs()
        env.KAPETA_CONSUMER_RESOURCE_KAFKA_HOST = 'kafka';
        env.KAPETA_CONSUMER_RESOURCE_KAFKA_PORT = '9092';
        let prefix = 'KAPETA_CONSUMER';
        let res = new DockerComposeConfigProvider('kafka', 'host', 'kafka', 'kafka').getEnvVarsWithPrefix(prefix);
        expect(res.resource.kafka.host).toBe("kafka");
        expect(res.resource.kafka.port).toBe("9092");
    })
})

function clearAllEnvs() {
    // clear all env vars
    for (let key in env) {
        if (key.startsWith('KAPETA_')) {
            delete env[key];
        }
    }

}
