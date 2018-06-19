import cosmiconfig from "cosmiconfig";
import { MigrationConfig } from "./../migration/config";
import { ProxyConfig } from "./../proxy/config";
import { ConfigFactory } from "../../util/factories/ConfigFactory";
import { formatAlert, LogType } from "../../util/methods/logging";
import { BrowserConfig } from "./../browser/config";

require("cosmiconfig").default = require("cosmiconfig");

export const GlobalConfig = {
  browser: ConfigFactory(BrowserConfig),
  migration: ConfigFactory(MigrationConfig),
  proxy: ConfigFactory(ProxyConfig)
};

export default async function(vorpal: any) {
  const explorer = cosmiconfig("wcm", {
    searchPlaces: ["package.json", ".wcmrc"]
  });

  const result = explorer.searchSync();

  if (result) {
    for (const namespace in result.config) {
      switch (namespace) {
        case "migration":
          GlobalConfig.migration.updateInstance(result.config[namespace]);
          break;
        case "proxy":
          GlobalConfig.proxy.updateInstance(result.config[namespace]);
          break;
        default:
          vorpal.log(formatAlert(vorpal, LogType.ERROR, 'Unknown configuration key "%s".', namespace));
      }
    }
  }
}
