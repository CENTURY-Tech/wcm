import * as path from "path";
import * as Vorpal from "vorpal";
import { readFileSync, statSync, mkdirSync, writeFileSync } from "fs";
import { load } from "cheerio";
import { ConfigReader } from "../../util";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator, displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config/index";
import { BundleConfig } from "./config";
import { TSBundler } from "./bundlers/TSBlunder";

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

function bundleProject(): ConfigReader<BundleConfig, AsyncIterableIterator<[string, string, string]>> {
  return ConfigReader(async function*(config) {
    const tsBundler = new TSBundler();

    const bundleSrcDir = config.get("bundleSrcDir");
    const bundleOutDir = config.get("bundleOutDir");
    const components = config.get("components");

    let pending = 0;
    let completed = 0;

    for (const groupRoot in components) {
      pending += components[groupRoot].length;
      yield [completed, pending, `Building: ${groupRoot}`];

      for (const entry of components[groupRoot]) {
        build(tsBundler, groupRoot, path.resolve(), entry as string, bundleSrcDir, bundleOutDir);
        yield [++completed, pending, `Building: ${groupRoot}`];
      }
    }

    yield [completed, pending, "Transpiling TS"];
    tsBundler.execCompilation({ bundleSrcDir, bundleOutDir });
    yield [completed, pending, "Finished"];
  });
}

function build(tsBundler: TSBundler, groupRoot: string, projectRoot: string, srcPath: string, srcRoot: string, distRoot: string) {
  const $ = load(readFileSync(path.resolve(projectRoot, srcRoot, srcPath), { encoding: "utf8" }));

  $('link[rel="import"]').each(function(this: Cheerio) {
    const href = $(this).attr("href");
    const lookup = path.relative(srcRoot, path.resolve(srcRoot, path.dirname(srcPath), href));

    if (lookup.startsWith(groupRoot)) {
      build(tsBundler, groupRoot, projectRoot, lookup, srcRoot, distRoot);
    }
  });

  $("script[src]").each(function(this: Cheerio) {
    const src = $(this).attr("src");

    if (src.endsWith(".ts")) {
      tsBundler.addRootName(path.resolve(projectRoot, srcRoot, path.dirname(srcPath), src));
      $(this).attr("src", replaceExt(src, ".js"));
    }
  });

  const outPath = path.resolve(projectRoot, distRoot, srcPath);

  try {
    statSync(path.dirname(outPath));
  } catch (err) {
    if (err.code === "ENOENT") {
      mkdirSync(path.dirname(outPath), { recursive: true } as any);
    }
  }

  writeFileSync(outPath, (($("head").html() as string) + $("body").html()) as string);
}

function replaceExt(target: string, ext: string) {
  return path.join(path.dirname(target), path.basename(target, path.extname(target)) + ext);
}
