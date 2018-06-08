import { Reader } from "monet";
import { ParserConfig } from "./classes/ParserConfig";
import { VorpalCommand } from "../vorpal";

import { configList, configGet, configSet, depsList, depsScan } from "./methods";

export type ParserReader<T> = Reader<{ prompt: VorpalCommand; config: ParserConfig }, T>;
export const ParserReader = Reader;

export default function(vorpal: any) {
  vorpal
    .command("parser config list", "List the current config for the parser")
    .alias("parser config-list", "parser list-config")
    .action(async function(this: VorpalCommand, args: any) {
      configList().run({ prompt: this, config: ParserConfig.getOrCreate() });
    });

  vorpal
    .command("parser config get <key>", "Get a config value for the parser")
    .alias("parser config-get", "parser get-config")
    .action(async function(this: VorpalCommand, args: any) {
      configGet(args.key).run({ prompt: this, config: ParserConfig.getOrCreate() });
    });

  vorpal
    .command("parser config set <key> <value>", "Set a config value for the parser")
    .alias("parser config-set", "parser set-config")
    .action(async function(this: VorpalCommand, args: any) {
      configSet(args.key, args.value).run({ prompt: this, config: ParserConfig.getOrCreate() });
    });

  vorpal
    .command("parser deps scan", "Scan your project and map its dependencies")
    .alias("parser deps-scan", "parser scan-deps")
    .action(async function(this: VorpalCommand, args: any) {
      depsScan().run({ prompt: this, config: ParserConfig.getOrCreate() });
    });

  vorpal
    .command("parser deps list", "List the install dependencies in your project")
    .alias("parser deps-list", "parser list-deps")
    .action(async function(this: VorpalCommand, args: any) {
      depsList().run({ prompt: this, config: ParserConfig.getOrCreate() });
    });
}
