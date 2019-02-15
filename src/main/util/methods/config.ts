import { ConfigReader } from "..";

/**
 * List the currently stored configuration.
 */
export function listConfig<T>(): ConfigReader<T, IterableIterator<[keyof T, string]>> {
  return ConfigReader(function*(config) {
    for (const key of config.assignableKeys) {
      yield [key, JSON.stringify(config.get(key), null, 2)] as [keyof T, string];
    }
  });
}

/**
 * Print the configured value store for the supplied key, or print an error if
 * the key is not valid.
 *
 * @param key
 */
export function getConfig<T, K extends keyof T = keyof T>(key: K): ConfigReader<T, string> {
  return ConfigReader(config => JSON.stringify(config.get(key), null, 2));
}

/**
 * Persist the configuration value for the supplied key, or print an error if
 * the key is not valid.
 *
 * @param key
 * @param value
 */
export function setConfig<T, K extends keyof T = keyof T>(key: K, value: T[K]): ConfigReader<T, void> {
  return ConfigReader(config => config.set(key, value));
}
