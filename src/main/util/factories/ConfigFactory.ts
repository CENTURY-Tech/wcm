import { Config } from "../classes/Config";

export interface ConfigFactory<T> {
  getOrCreateInstance(config?: Partial<T>): Config<T>;
  updateInstance(newConfig?: Partial<T>): void;
  destroyInstance(): void;
}

export function ConfigFactory<T>(defaultConfig: T): ConfigFactory<T> {
  let configInstance: Config<T> | null;

  return {
    /**
     * Retrieve the `parserConfigInstance` singleton or create and assign a new one if required.
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

    updateInstance(newConfig: Partial<T> = {}): void {
      defaultConfig = Object.assign(defaultConfig, newConfig);
      this.destroyInstance();
    },

    /**
     * Clear the `parserConfigInstance` singleton.
     */
    destroyInstance(): void {
      configInstance = null;
    }
  };
}
