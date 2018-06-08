import { ConfigReader } from "..";

/**
 * List the currently stored configuration.
 */
export function listConfig<T>(): ConfigReader<T, IterableIterator<[keyof T, T[keyof T]]>> {
  return ConfigReader(function*(config) {
    for (const key of config.assignableKeys) {
      yield [key, config.get(key)] as [keyof T, T[keyof T]];
    }
  });
}

/**
 * Print the configured value store for the supplied key, or print an error if
 * the key is not valid.
 *
 * @param key
 */
export function getConfig<T, K extends keyof T = keyof T>(key: K): ConfigReader<T, T[K]> {
  return ConfigReader(config => config.get(key));
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
