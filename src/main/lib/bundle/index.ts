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

  vorpal.command("bundle", "Bundle your project").action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
    await bundleProject()
      .map(displayProgress(vorpal, "(%s/%s) %s"))
      .run(GlobalConfig.bundle.getOrCreateInstance());
  });
}

function bundleProject(): ConfigReader<BundleConfig, AsyncIterableIterator<[number, number, string]>> {
  return walkProject("internal").flatMap((iterator) => ConfigReader(async function* (config: Config<BundleConfig>) {
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
}

export function walkProject(mode: "internal" | "external"): ConfigReader<BundleConfig, AsyncIterableIterator<Bundler.RootName>> {
  return ConfigReader(async function*(config) {
    const bundleSrcDir = config.get("bundleSrcDir");
    const components = config.get("components");

    const found: string[] = [];

    for (const [groupRoot, entry] of flattenComponents(components)) {
      for await (const [ref, contents, filepath] of walkGroupRoot(groupRoot, path.resolve(), entry, bundleSrcDir, found)) {
        switch (mode) {
          case "internal":
            yield [ref, contents, filepath]; yield *walkGroupRoot(groupRoot, path.resolve(), filepath, bundleSrcDir, found); break;
          case "external":
            yield [ref, contents, filepath]; break;
        }
      }
    }
  });

  async function *walkGroupRoot(groupRoot: string, projectRoot: string, srcPath: string, srcRoot: string, found: string[]): AsyncIterableIterator<Bundler.RootName> {
    for await (const [ref, contents, includePath] of walkSource(path.resolve(projectRoot, srcRoot, srcPath))) {
      const lookup = path.relative(srcRoot, path.resolve(srcRoot, path.dirname(srcPath), includePath));

      if (lookup.startsWith(groupRoot) && !found.includes(lookup)) {
        found.push(lookup)
        yield *walkGroupRoot(groupRoot, projectRoot, lookup, srcRoot, found);
      }

      switch (mode) {
        case "internal":
          if (lookup.startsWith(groupRoot)) yield [ref, contents, lookup]; break;
        case "external":
          if (!lookup.startsWith(groupRoot)) yield [ref, contents, lookup]; break;
      }
    }
  }
}

export async function *walkSource(filepath: string): AsyncIterableIterator<Bundler.RootName> {
  const $ = load(await util.promisify(readFile)(filepath, "utf8"));

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
