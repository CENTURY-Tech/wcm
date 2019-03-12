import * as path from "path";
import * as util from "util";
import { writeFile } from "fs";
import { load } from "cheerio";
import * as Vorpal from "vorpal";
import { CombinedConfigReader, ConfigReader } from "../../util";
import { displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config/index";
import { bundleProject, walkProject } from "../bundle";
import { BundleConfig } from "../bundle/config";
import { BrowserConfig } from "../browser/config";
import { Bundler } from "../bundle/bundlers/Bundler";

export default function(vorpal: Vorpal) {
  vorpal
    .command("pack", "Package a component and all of its dependencies into a single file")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      const bundleConfig = GlobalConfig.bundle.getOrCreateInstance().temp();
      const browserConfig = GlobalConfig.browser.getOrCreateInstance().temp();

      await packComponent(bundleConfig.get("components").behaviours[0])
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run([bundleConfig, browserConfig]);
    });
}

export function packComponent(filepath: string) {
  return CombinedConfigReader<[BundleConfig, BrowserConfig], AsyncIterableIterator<[number, number, string]>>(async function* (config) {
    const $ = load("");

    const bundleOutDir = config[0].get("bundleOutDir");
    const interceptSrc = config[1].get("interceptSrc");
    const found: string[] = [];

    let completed = 0;
    let pending = 0;

    for await (let [, includePath] of walkTargetFile(path.resolve(bundleOutDir, filepath), interceptSrc, found)) {
      yield [completed, ++pending, "Walking project"];

      try {
        $("body").append(await Bundler.extractContentsFromSource(includePath));
      } catch { }
    }

    await util.promisify(writeFile)("./elem.html", await Bundler.extractContentsFromStatic($), "utf8");

    yield [completed, pending, "Finished"];
  });

  async function *walkTargetFile(filepath: string, interceptSrc: string, found: string[]): AsyncIterableIterator<Bundler.RootName> {
    for await (let [ref, includePath] of Bundler.walkSource(filepath)) {
      if (includePath.startsWith(`/${interceptSrc}`)) {
        includePath = path.resolve(path.join(".", includePath));
      }

      if (!found.includes(includePath)) {
        found.push(includePath);
      } else {
        continue;
      }

      if (includePath.endsWith(".html")) {
        yield *walkTargetFile(includePath, interceptSrc, found);
      }
      yield [ref, includePath]
    }
  }
}
