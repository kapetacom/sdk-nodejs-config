import Config, { ConfigProvider } from '../index';

export const runApp = <T>(fn: (config: ConfigProvider) => Promise<T>, blockDir: string): void => {
    Config.init(blockDir)
        .then(fn)
        .catch((err) => {
            console.error('Application failed', err);
            process.exit(1);
        });
};

export const toEnvName = (name: string): string => {
    // Insert underscore between lowercase and uppercase letters
    name = name.replace(/([a-z])([A-Z])/g, '$1_$2');

    // Convert to upper case
    name = name.toUpperCase();

    // Remove non-alphanumeric characters from the start and end
    name = name.replace(/^[^A-Z0-9_]+|[^A-Z0-9_]+$/g, '');

    // Replace any sequence of non-alphanumeric characters with a single underscore
    name = name.replace(/[^A-Z0-9_]+/g, '_');

    return name;
};
