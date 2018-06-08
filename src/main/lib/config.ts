import cosmiconfig from "cosmiconfig";
import { MigrationConfig } from "./migration";
import { ProxyConfig } from "./proxy";
import { ConfigFactory } from "../util/factories/ConfigFactory";
import { formatAlert, LogType } from "../util/methods/logging";
import { BrowserConfig } from "./browser";

require("cosmiconfig").default = require("cosmiconfig");

export const GlobalConfig = {
  browser: ConfigFactory<BrowserConfig>({
    manifestUrl: "manifest.json",
    interceptSrc: "bower_components",
    interceptDest: "web_components",
    minifyWorkerFiles: false
  }),
  migration: ConfigFactory<MigrationConfig>({
    depsRootDir: "node_modules",
    depsOutDir: "web_components",
    packageFile: "package.json",
    packageLookupName: "name",
    packageLookupDependencies: "dependencies",
    packageLookupVersion: "version"
  }),
  proxy: ConfigFactory<ProxyConfig>({
    host: "localhost",
    port: 8080
  })
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
