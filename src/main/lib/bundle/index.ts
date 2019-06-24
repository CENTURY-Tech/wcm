import * as path from "path";
import * as util from "util";
import * as Vorpal from "vorpal";
import { readFile, writeFile } from "fs";
import { ConfigReader } from "../../util";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator, displayProgress, Loggable } from "../../util/methods/logging";
import { GlobalConfig } from "../config";
import { BundleConfig } from "./config";
import { HTMLBundler } from "./bundlers/html-bundler";
import { TSBundler } from "./bundlers/ts-bundler";
import { Bundler } from "./bundlers/Bundler";

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
    .option("-m ,--minify", "Minify the output")
    .option("-i ,--inlineJs", "Inline JavaScript")
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

      if (args.options.minify) {
        bundleConfig.set("minify", true);
      }

      if (args.options.inlineJs) {
        bundleConfig.set("inlineJs", true);
      }

      await bundleProject
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run(bundleConfig);
    });
}

export const bundleProject: ConfigReader<BundleConfig, AsyncIterableIterator<[number, number, string]>> =
  walkProject("internal").flatMap((iterator) => ConfigReader(async function* (config) {
    const htmlBundler = new HTMLBundler();
    const tsBundler = new TSBundler();

    let completed = 0;
    let pending = 0;

    for await (const [ref, filepath] of iterator) {
      yield [completed, ++pending, "Walking project"];

      switch (path.extname(filepath)) {
        case ".ts":
          tsBundler.addRootName([ref, filepath]); break;
        case ".html":
          htmlBundler.addRootName([ref, filepath]); break;
        default:
          throw Error(`Unhandled file extension: "${path.extname(filepath)}"`);
      }
    }

    const rawConfig = config.raw();
    const bundleSrcDir = path.resolve(rawConfig.bundleSrcDir);
    const bundleOutDir = path.resolve(rawConfig.bundleOutDir);

    yield [completed, pending, "Processing TS"];
    for await (const processedRootName of tsBundler.execCompilation({ bundleSrcDir, bundleOutDir })) {
      if (processedRootName.constructor === Loggable) {
        yield processedRootName;
      } else {
        await Bundler.finalize(processedRootName as Bundler.ProcessedRootName, rawConfig);
        yield [++completed, pending, "Processing TS"];
      }
    }

    yield [completed, pending, "Processing HTML"];
    for await (const processedRootName of htmlBundler.execCompilation({ bundleSrcDir, bundleOutDir })) {
      await Bundler.finalize(processedRootName, rawConfig);
      yield [++completed, pending, "Processing HTML"];
    }

    yield [completed, pending, "Finished"];
  }));

export function walkProject(mode: "internal" | "external" | "*"): ConfigReader<BundleConfig, AsyncIterableIterator<Bundler.RootName>> {
  return ConfigReader(async function*(config) {
    const bundleSrcDir = config.get("bundleSrcDir");
    const components = config.get("components");

    const found: Set<string> = new Set;

    for (const [groupRoot, entry] of flattenComponents(components)) {
      const srcRoot = path.resolve(bundleSrcDir);
      const srcPath = path.resolve(srcRoot, entry);

      yield *yieldRootNames([null, srcPath], srcRoot);
      yield *walkGroupRoot(groupRoot, srcRoot, srcPath, found);
    }
  });

  function *yieldRootNames([ref, includePath]: Bundler.RootName, srcRoot: string): IterableIterator<Bundler.RootName> {
    switch (mode) {
      case "*":
        yield [ref, includePath]; break;
      case "internal":
        if (includePath.startsWith(srcRoot)) yield [ref, includePath]; break;
      case "external":
        if (!includePath.startsWith(srcRoot)) yield [ref, includePath]; break;
    }
  }

  async function *walkGroupRoot(groupRoot: string, srcRoot: string, srcPath: string, found: Set<string>): AsyncIterableIterator<Bundler.RootName> {
    for await (const [ref, includePath] of Bundler.walkSource(srcPath)) {
      if (found.has(includePath)) {
        continue;
      } else {
        found.add(includePath);
      }

      if (includePath.startsWith(srcRoot) && includePath.endsWith(".html")) {
        yield *walkGroupRoot(groupRoot, srcRoot, path.resolve(srcRoot, includePath), found);
      }

      yield *yieldRootNames([ref, includePath], srcRoot);
    }
  }
}

function flattenComponents(components: Record<string, string[]> | string[]): Array<[string, string]> {
  if (Array.isArray(components)) {
    components = { "": components };
  }
  
  return Object.entries(components).reduce((acc, [groupRoot, entries]) => {
    return acc.concat(entries.map((entry): [string, string] => ([groupRoot, entry])));
  }, [] as Array<[string, string]>);
}
