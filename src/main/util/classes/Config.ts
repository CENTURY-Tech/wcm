export class Config<T> {
  constructor(private config: T, public assignableKeys: Array<keyof T> = Object.keys(config) as (keyof T)[]) {}

  public get<K extends keyof T>(key: K): T[K] {
    return this.config[key];
  }

  public set<K extends keyof T>(key: K, value: T[K]): void {
    this.config[key] = value;
  }
}
