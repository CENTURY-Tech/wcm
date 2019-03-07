export interface ConfigTarget {
  private ?: any
};

/**
 * A simple configuration store with typesafe `get` and `set` methods. An array of `assignableKeys` is assigned on
 * construction to provide a safe iterable when listing the configuration keys.
 */
export class Config<T extends ConfigTarget> {
  constructor(private config: T, public assignableKeys: Array<keyof T> = Object.keys(config) as (keyof T)[]) {}

  /**
   * Retrieve the value assigned to the key provided.
   *
   * @param key
   */
  public get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  /**
   * Assign the value to the key provided.
   *
   * @param key
   * @param value
   */
  public set<K extends keyof T>(key: K, value: T[K]): void {
    this.config[key] = value;
  }

  public temp(): Config<T> {
    return new Config(JSON.parse(JSON.stringify(this.config)));
  }
}
