let serverConfigInstance: ServerConfig;

export class ServerConfig {
  public "host" = "localhost";
  public "port" = "8080";

  /**
   * Retrieve the `serverConfigInstance` singleton or create and assign a new one if required.
   */
  static getOrCreate(config: Partial<ServerConfig> = {}) {
    if (!serverConfigInstance) {
      serverConfigInstance = new ServerConfig(config);
    }

    return serverConfigInstance;
  }

  static assignableKeys: Array<keyof ServerConfig> = ["host", "port"];

  constructor(config: Partial<ServerConfig>) {
    Object.assign(this, config);
  }
}
