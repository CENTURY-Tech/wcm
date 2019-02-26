import cosmiconfig from "cosmiconfig";
import * as Vorpal from "vorpal";
import { ConfigFactory } from "../../util/factories/ConfigFactory";
import { formatAlert, LogType } from "../../util/methods/logging";
import { BrowserConfig } from "./../browser/config";
import { BundleConfig } from "../bundle/config";
import { MigrationConfig } from "./../migration/config";
import { ProxyConfig } from "./../proxy/config";

require("cosmiconfig").default = require("cosmiconfig");

export const GlobalConfig = {
  browser: ConfigFactory(BrowserConfig),
  bundle: ConfigFactory(BundleConfig),
  migration: ConfigFactory(MigrationConfig),
  proxy: ConfigFactory(ProxyConfig)
};

export default async function(vorpal: Vorpal) {
  const explorer = cosmiconfig("wcm", {
    searchPlaces: ["package.json", ".wcmrc"]
  });

  const result = explorer.searchSync();

  if (result) {
    for (const namespace in result.config) {
      switch (namespace) {
        case "browser":
          GlobalConfig.browser.updateInstance(result.config[namespace]);
          break;
        case "bundle":
          GlobalConfig.bundle.updateInstance(result.config[namespace]);
          break;
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