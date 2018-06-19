import * as path from "path";
import { copy, writeJson } from "fs-extra";
import { VorpalCommand } from "../../vorpal";
import { ConfigReader } from "../../util";
import { Dependency } from "../../util/classes/Dependency";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator, logAsyncIterator, displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config/index";
import { MigrationConfig } from "./config";

export default function(vorpal: any) {
  vorpal
    .command("migration config list", "List the current config for the migrator")
    .alias("migration config-list", "migration list-config")
    .action(async function(this: VorpalCommand, args: any) {
      await listConfig<MigrationConfig>()
        .map(logIterator(this, "%s: %s"))
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration config get <key>", "Get a config value for the migrator")
    .alias("migration config-get", "migration get-config")
    .action(async function(this: VorpalCommand, args: any) {
      await getConfig<MigrationConfig>(args.key)
        .map(this.log)
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration config set <key> <value>", "Set a config value for the migrator")
    .alias("migration config-set", "migration set-config")
    .action(async function(this: VorpalCommand, args: any) {
      await setConfig<MigrationConfig>(args.key, args.value).run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration deps list", "List the installed dependencies in your project")
    .option("-o ,--outFile <path>", "Specifiy a path to output the dependencies object")
    .alias("migration deps-list", "migration list-deps")
    .action(async function(this: VorpalCommand, args: any) {
      await listDependencies()
        .map(async iterator => {
          if (args.options.outFile) {
            const dependencies: Record<string, string> = {};

            for await (const [dependencyName, dependencyVersion] of iterator) {
              dependencies[dependencyName] = dependencyVersion;
            }

            await writeJson(args.options.outFile, dependencies, { spaces: 2 });
          } else {
            return logAsyncIterator(this, "%s: %s")(iterator);
          }
        })
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal.command("migration run", "Migrate your project to use WCM fully").action(async function(this: VorpalCommand, args: any) {
    await runMigration()
      .map(displayProgress(vorpal, "(%s/%s) %s"))
      .run(GlobalConfig.migration.getOrCreateInstance());
  });
}

/**
 * List the project dependencies.
 */
function listDependencies(): ConfigReader<MigrationConfig, AsyncIterableIterator<[string, string, string]>> {
  return iterateDependencies().map(async function*(dependencies) {
    for await (const dependency of dependencies) {
      yield [await dependency.getName(), await dependency.getVersion()];
    }
  });
}

function runMigration(): ConfigReader<MigrationConfig, AsyncIterableIterator<[string, string, string]>> {
  return iterateMigration().map(async function*(migration) {
    let completed = 0;
    const steps = [];

    for await (const step of migration) {
      yield [0, steps.push(step), "Starting"];
    }

    for await (const [dependency, copy] of steps) {
      yield [completed++, steps.length, await dependency.getName()];
      await copy();
    }

    yield [completed, steps.length, "Finished"];
  });
}

function iterateMigration(): ConfigReader<MigrationConfig, AsyncIterableIterator<[Dependency, () => Promise<void>]>> {
  return iterateDependencies().flatMap(function(dependencies) {
    return ConfigReader(async function*(config) {
      const outDir = config.get("depsOutDir");

      for await (const dependency of dependencies) {
        if (dependency.dirname === ".") {
          continue;
        }

        yield [
          dependency,
          async () => {
            await copy(dependency.dirname, path.join(outDir, await dependency.getName(), await dependency.getVersion()));
          }
        ];
      }
    });
  });
}

function iterateDependencies(): ConfigReader<MigrationConfig, AsyncIterableIterator<Dependency>> {
  return ConfigReader(async function*(config) {
    const projectConfig = new Dependency(
      config.get("depsRootDir"),
      config.get("packageFile"),
      config.get("packageLookupName"),
      config.get("packageLookupVersion"),
      config.get("packageLookupDependencies")
    );

    const dependencies = new Set(Object.keys(await projectConfig.copy({ dirname: "." }).getDependencies()));

    for (const dirname of dependencies) {
      const dependency = projectConfig.copy({ dirname: path.join(projectConfig.dirname, dirname) });

      for (const subDependency in await dependency.getDependencies()) {
        dependencies.add(subDependency);
      }

      yield dependency;
    }
  });
}
