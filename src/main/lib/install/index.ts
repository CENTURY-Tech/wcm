import * as path from "path";
import * as util from "util";
import * as fs from "fs";
import * as Vorpal from "vorpal";
import * as download from "download";
import { CombinedConfigReader } from "../../util";
import { displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config";
import { BrowserConfig } from "../browser/config";
import { BundleConfig } from "../bundle/config";
import { walkProject, walkSource } from "../bundle";
import { ProxyConfig } from "../proxy/config";
import { ReverseProxy } from "../browser";
import { Bundler } from "../bundle/bundlers/Bundler";

export default function(vorpal: Vorpal) {
  vorpal
    .command("install", "Install all dependencies of this project")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await installDependencies
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run([
          GlobalConfig.bundle.getOrCreateInstance(),
          GlobalConfig.browser.getOrCreateInstance(),
          GlobalConfig.proxy.getOrCreateInstance()
        ]);
    });
}

export const installDependencies: CombinedConfigReader<[BundleConfig, BrowserConfig, ProxyConfig], AsyncIterableIterator<[string, string, string]>> =
  walkProject("external").local((config: any) => config[0])
    .flatMap((iterator) => CombinedConfigReader<[BundleConfig, BrowserConfig, ProxyConfig], AsyncIterableIterator<[string, string, string]>>(async function* (config) {
      const progress = {
        completed: 0,
        pending: 0
      }

      const manifest = require(require.resolve("manifest.json", { paths: [process.cwd()] }));

      const interceptSrc = config[1].get("interceptSrc");
      const interceptDest = config[1].get("interceptDest");

      const processed: string[] = [];

      for await (const rootName of iterator) {
        yield *processInstallFor(rootName, manifest, interceptSrc, interceptDest, progress, processed);
      }

      yield [progress.completed, progress.pending, "Finished"];
    }));

async function *processInstallFor([ref, contents, filepath]: Bundler.RootName, manifest: any, interceptSrc: string, interceptDest: string, progress: Progress, processed: string[]): AsyncIterableIterator<[number, number, string]> {
  const { versionedUrl } = ReverseProxy.resolveUrl(filepath, manifest, { interceptSrc, interceptDest });
  
  const destFilepath = path.join("./", "web_components", versionedUrl.replace(interceptDest, ""));
  
  if (versionedUrl.includes(interceptDest) && !processed.includes(destFilepath)) {
    processed.push(destFilepath);

    yield [progress.completed, ++progress.pending, `Found: ${filepath}`];

    await ensureDirectoryFor(`${interceptSrc}/${versionedUrl.replace(interceptDest, "")}`);

    yield [progress.completed, progress.pending, `Downloading: ${filepath} -> ${destFilepath}`];

    await download(versionedUrl, path.dirname(destFilepath)).catch((err: Error) => {
      console.log("Error handled: ", err.message);
    });

    yield [progress.completed, progress.pending, `Downloaded: ${filepath} -> ${destFilepath}`];

    try {
      for await (let [ref, contents, includePath] of walkSource(destFilepath)) {
        yield *processInstallFor([ref, contents, path.resolve(path.dirname(filepath), includePath)], manifest, interceptSrc, interceptDest, progress, processed);
      }
    } catch (err) {
      console.log("Error handled: ", err.message);
    }
  
    yield [++progress.completed, progress.pending, `Completed: ${filepath}`]
  }
}

async function ensureDirectoryFor(filepath: string) {
  try {
    await util.promisify(fs.stat)(path.dirname(filepath));
  } catch (err) {
    if (err.code === "ENOENT") {
      await util.promisify(fs.mkdir)(path.dirname(filepath), { recursive: true } as any);
    }
  }
}

interface Progress {
  completed: number;
  pending: number;
}
