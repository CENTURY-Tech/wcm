import { Config, ConfigTarget } from "../classes/config";

export interface ConfigFactory<T extends ConfigTarget> {
  getOrCreateInstance(config?: Partial<T>): Config<T>;
  
  updateInstance(config?: Partial<T>): void;
  destroyInstance(): void;
}

export function ConfigFactory<T extends ConfigTarget>(defaultConfig: T): ConfigFactory<T> {
  let configInstance: Config<T> | null;

  return {
    /**
     * Retrieve the `configInstance` singleton or create and assign a new one if required.
     */
    getOrCreateInstance(config: Partial<T> = {}): Config<T> {
      if (!configInstance) {
        configInstance = new Config<T>(defaultConfig);

        for (const key in config) {
          configInstance.set(key, config[key] as T[keyof T]);
        }
      }

      return configInstance;
    },

    updateInstance(config: Partial<T> = {}): void {
      defaultConfig = Object.assign(defaultConfig, config);
      this.destroyInstance();
    },

    /**
     * Clear the `configInstance` singleton.
     */
    destroyInstance(): void {
      configInstance = null;
    }
  };
}
