import * as path from "path";
import * as Vorpal from "vorpal";
import { copy, writeJson } from "fs-extra";
import { ConfigReader } from "../../util";
import { Dependency } from "../../util/classes/dependency";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator, logAsyncIterator, displayProgress } from "../../util/methods/logging";
import { GlobalConfig } from "../config/index";
import { MigrationConfig } from "./config";

export default function(vorpal: Vorpal) {
  vorpal
    .command("migration config list", "List the current config for the migrator")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await listConfig<MigrationConfig>()
        .map(logIterator(this, "%s: %s"))
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration config get <key>", "Get a config value for the migrator")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await getConfig<MigrationConfig>(args.key)
        .map(this.log)
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration config set <key> <value>", "Set a config value for the migrator")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await setConfig<MigrationConfig>(args.key, args.value)
        .run(GlobalConfig.migration.getOrCreateInstance());
    });

  vorpal
    .command("migration deps list", "List the installed dependencies in your project")
    .option("-o ,--outFile <path>", "Specifiy a path to output the dependencies object")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await listDependencies
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

  vorpal
    .command("migration run", "Migrate your project to use WCM fully")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await runMigration
        .map(displayProgress(vorpal, "(%s/%s) %s"))
        .run(GlobalConfig.migration.getOrCreateInstance());
    });
}

const iterateDependencies: ConfigReader<MigrationConfig, AsyncIterableIterator<Dependency>> =
  ConfigReader(async function*(config) {
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

const iterateMigration: ConfigReader<MigrationConfig, AsyncIterableIterator<[Dependency, () => Promise<void>]>> =
  iterateDependencies.flatMap((dependencies) => ConfigReader(async function*(config) {
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
  }));

/**
 * List the project dependencies.
 */
const listDependencies: ConfigReader<MigrationConfig, AsyncIterableIterator<[string, string, string]>> =
  iterateDependencies.map(async function*(dependencies) {
    for await (const dependency of dependencies) {
      yield [await dependency.getName(), await dependency.getVersion()];
    }
  });

const runMigration: ConfigReader<MigrationConfig, AsyncIterableIterator<[string, string, string]>> =
  iterateMigration.map(async function*(migration) {
    let completed = 0;
    const steps = [];

    for await (const step of migration) {
      yield [0, steps.push(step), "Starting"];
    }

    for await (const [dependency, copy] of steps) {
      await copy();
      yield [++completed, steps.length, await dependency.getName()];
    }

    yield [completed, steps.length, "Finished"];
  });
