import { ConfigTarget } from "../../util/classes/config";

export interface ProxyConfig extends ConfigTarget {
  host: string;
  port: number;
}

export const ProxyConfig: ProxyConfig = {
  host: "localhost",
  port: 8080
};
