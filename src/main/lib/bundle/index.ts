import * as path from "path";
import * as util from "util";
import * as Vorpal from "vorpal";
import { readFile } from "fs";
import { load } from "cheerio";
import { ConfigReader } from "../../util";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator, displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config";
import { BundleConfig } from "./config";
import { HTMLBundler } from "./bundlers/html-bundler";
import { TSBundler } from "./bundlers/ts-bundler";
import { Bundler } from "./bundlers/Bundler";
import { Config } from "../../util/classes/config";

export default function(vorpal: Vorpal) {
  vorpal
    .command("bundle config list", "List the current config for the bundler")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      return listConfig<BundleConfig>()
        .map(logIterator(this, "%s: %s"))
        .run(GlobalConfig.bundle.getOrCreateInstance());
    });

  vorpal
    .command("bundle config get <key>", "Get a config value for the bundler")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      return getConfig<BundleConfig>(args.key)
        .map(this.log)
        .run(GlobalConfig.bundle.getOrCreateInstance());
    });

  vorpal
    .command("bundle config set <key> <value>", "Set a config value for the migrator")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      return setConfig<BundleConfig>(args.key, args.value).run(GlobalConfig.bundle.getOrCreateInstance());
    });

  vorpal
    .command("bundle", "Bundle your project")
    .option("-c ,--component <name>", "Specifiy the component to bundle")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      const bundleConfig = GlobalConfig.bundle.getOrCreateInstance().temp();

      if (args.options.component) {
        if (!bundleConfig.get("components")[args.options.component]) {
          return this.log("No component configured with the name '%s'", args.options.component);
        }

        bundleConfig.set("components", {
          [args.options.component]: bundleConfig.get("components")[args.options.component]
        });
      }
      
      await bundleProject
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run(bundleConfig);
    });
}

const bundleProject: ConfigReader<BundleConfig, AsyncIterableIterator<[number, number, string]>> =
  walkProject("internal").flatMap((iterator) => ConfigReader(async function* (config) {
    const htmlBundler = new HTMLBundler();
    const tsBundler = new TSBundler();

    const bundleSrcDir = config.get("bundleSrcDir");
    const bundleOutDir = config.get("bundleOutDir");

    let completed = 0;
    let pending = 0;

    for await (const [ref, contents, filepath] of iterator) {
      yield [completed, ++pending, "Walking project"]

      switch (path.extname(filepath)) {
        case ".ts":
          tsBundler.addRootName([ref, contents, filepath]); break;
        case ".html":
          htmlBundler.addRootName([ref, contents, filepath]); break;
        default:
          throw Error(`Unhandled file extension: "${path.extname(filepath)}"`);
      }
    }

    yield [completed, pending, "Processing TS"];
    for await (const [] of tsBundler.execCompilation({ bundleSrcDir, bundleOutDir })) {
      yield [++completed, pending, "Processing TS"];
    }

    yield [completed, pending, "Processing HTML"];
    for await (const [] of htmlBundler.execCompilation({ bundleSrcDir, bundleOutDir })) {
      yield [++completed, pending, "Processing HTML"];
    }

    yield [completed, pending, "Finished"];
  }));

export function walkProject(mode: "internal" | "external" | "*"): ConfigReader<BundleConfig, AsyncIterableIterator<Bundler.RootName>> {
  return ConfigReader(async function*(config) {
    const bundleSrcDir = config.get("bundleSrcDir");
    const components = config.get("components");

    const found: string[] = [];

    for (const [groupRoot, entry] of flattenComponents(components)) {
      yield *walkGroupRoot(groupRoot, entry, path.resolve(bundleSrcDir), found)
    }
  });

  async function *walkGroupRoot(groupRoot: string, srcPath: string, srcRoot: string, found: string[]): AsyncIterableIterator<Bundler.RootName> {
    for await (const [ref, contents, includePath] of walkSource(path.resolve(srcRoot, srcPath))) {
      const absoluteLookup = path.resolve(srcRoot, path.dirname(srcPath), includePath);
      const relativeLookup = path.relative(srcRoot, absoluteLookup);

      if (!found.includes(absoluteLookup)) {
        found.push(includePath);
      } else {
        continue;
      }

      if (absoluteLookup.startsWith(srcRoot)) {
        yield *walkGroupRoot(groupRoot, relativeLookup, srcRoot, found);
      }

      switch (mode) {
        case "*":
          yield [ref, contents, relativeLookup]; break;
        case "internal":
          if (absoluteLookup.startsWith(srcRoot)) yield [ref, contents, relativeLookup]; break;
        case "external":
          if (!absoluteLookup.startsWith(srcRoot)) yield [ref, contents, relativeLookup]; break;
      }
    }
  }
}

export async function *walkSource(filepath: string, yieldSelf: boolean = true): AsyncIterableIterator<Bundler.RootName> {
  const $ = load(await util.promisify(readFile)(filepath, "utf8"));

  if (yieldSelf) {
    yield [null, $, filepath];
  }

  for (const elem of $('link[rel="import"]').toArray()) {
    yield [$(elem), $, $(elem).attr("href")];
  }

  for (const elem of $('script[src]').toArray()) {
    yield [$(elem), $, $(elem).attr("src")];
  }
}

function flattenComponents(components: Record<string, string[]>): Array<[string, string]> {
  return Object.entries(components).reduce((acc, [groupRoot, entries]) => {
    return acc.concat(entries.map((entry): [string, string] => ([groupRoot, entry])));
  }, [] as Array<[string, string]>);
}
