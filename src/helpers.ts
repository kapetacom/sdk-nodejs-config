import Config, { ConfigProvider } from '../index';

export const runApp = <T>(fn: (config: ConfigProvider) => Promise<T>, blockDir: string): void => {
    Config.init(blockDir)
        .then(fn)
        .catch((err) => {
            console.error('Application failed', err);
            process.exit(1);
        });
};
