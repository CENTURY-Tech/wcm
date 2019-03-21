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
import { walkProject } from "../bundle";
import { ReverseProxy } from "../browser";
import { Bundler } from "../bundle/bundlers/Bundler";

export default function(vorpal: Vorpal) {
  vorpal
    .command("install", "Install all dependencies of this project")
    .option("-c ,--component <name>", "Specifiy the component to install dependencies for")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      const bundleConfig = GlobalConfig.bundle.getOrCreateInstance().temp();
      const browserConfig = GlobalConfig.browser.getOrCreateInstance().temp();

      if (args.options.component) {
        if (!bundleConfig.get("components")[args.options.component]) {
          return this.log("No component configured with the name '%s'", args.options.component);
        }

        bundleConfig.set("components", {
          [args.options.component]: bundleConfig.get("components")[args.options.component]
        });
      }
      
      await installDependencies
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run([bundleConfig, browserConfig]);
    });
}

export const installDependencies: CombinedConfigReader<[BundleConfig, BrowserConfig], AsyncIterableIterator<[string, string, string]>> =
  walkProject("external").local((config: any) => config[0])
    .flatMap((iterator) => CombinedConfigReader<[BundleConfig, BrowserConfig], AsyncIterableIterator<[string, string, string]>>(async function* (config) {
      const progress = {
        completed: 0,
        pending: 0
      }

      const manifest = require(require.resolve("manifest.json", { paths: [process.cwd()] }));

      const interceptSrc = config[1].get("interceptSrc");
      const interceptDest = config[1].get("interceptDest");

      const processed: string[] = [];

      for await (const [, includePath] of iterator) {
        yield *processInstallFor("default", includePath, manifest, interceptSrc, interceptDest, progress, processed);
      }

      yield [progress.completed, progress.pending, "Finished"];
    }));

async function *processInstallFor(mode: "default" | "proxy", filepath: string, manifest: any, interceptSrc: string, interceptDest: string, progress: Progress, processed: string[]): AsyncIterableIterator<[number, number, string] | Error> {
  const { versionedUrl } = ReverseProxy.resolveUrl(filepath, manifest, { interceptSrc, interceptDest });
  
  let destFilepath: string;
  
  switch (mode) {
    case "default":
      destFilepath = path.resolve(path.join(".", filepath)); break;
    case "proxy":
      destFilepath = path.resolve(path.join("web_components", versionedUrl.replace(interceptDest, ""))); break;
    default:
      throw Error(`Unknown installation mode: "${mode}"`);
  }


  if (versionedUrl.includes(interceptDest) && !processed.includes(destFilepath)) {
    processed.push(destFilepath);

    yield [progress.completed, ++progress.pending, `Import processing: ${filepath}`];

    await ensureDirectoryFor(destFilepath);

    yield [progress.completed, progress.pending, `Downloading: ${versionedUrl} -> ${destFilepath}`];

    let processingErr: Error | undefined;

    try {
      await download(versionedUrl, path.dirname(destFilepath));
    } catch (err) {
      processingErr = Error(`Error whilst downloading: ${versionedUrl} -> ${destFilepath}\n✕ ${err.message}`);
    };

    if (!processingErr) {
      yield [progress.completed, progress.pending, `Downloaded: ${versionedUrl} -> ${destFilepath}`];
      
      if (destFilepath.endsWith(".html")) {
        yield [progress.completed, progress.pending, `Walking source for: ${versionedUrl} -> ${destFilepath}`];

        try {
          for await (let [, includePath] of Bundler.walkSource(destFilepath)) {
            includePath = path.join(path.dirname(filepath), path.relative(path.dirname(destFilepath), includePath));
            yield *processInstallFor(mode, includePath, manifest, interceptSrc, interceptDest, progress, processed);
          }

          yield [progress.completed, progress.pending, `Walking complete  for: ${filepath} -> ${destFilepath}`];
        } catch (err) {
          processingErr = Error(`Error whilst walking: ${destFilepath}\n✕ ${err.message}`);
        }
      }
    }
  
    if (!processingErr) {
      yield [++progress.completed, progress.pending, `Import processed: ${filepath}`];
    } else {
      yield processingErr;
    }
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
