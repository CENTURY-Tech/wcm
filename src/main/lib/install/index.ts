import * as Vorpal from "vorpal";
import { readJson } from "fs-extra";
import { ConfigReader } from "../../util";
import { downloadAsset } from "../../util/methods/assets";
import { displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config";
import { BrowserConfig } from "../browser/config";

export default function(vorpal: Vorpal) {
  vorpal
    .command("install", "Install all dependencies of this project")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await installDependencies()
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run(GlobalConfig.browser.getOrCreateInstance());
    });
}

export function installDependencies(): ConfigReader<BrowserConfig, AsyncIterableIterator<[string, string, string]>> {
  return ConfigReader(async function*(config) {
    let completed = 0;
    const dependencies: Array<[string, string]> = [];

    for (const dependency of Object.entries<string>(await readJson(config.get("manifestUrl")))) {
      yield [0, dependencies.push(dependency), "Starting"];
    }

    for (const [dependencyName, dependencyVersion] of dependencies.slice(0, 1)) {
      await downloadAsset(`${config.get("interceptDest")}/${dependencyName}/${dependencyVersion}`, `web_components/${dependencyName}`);
      yield [completed++, dependencies.length, `${dependencyName}@${dependencyVersion}`];
    }

    yield [completed, dependencies.length, "Finished"];
  });
}
