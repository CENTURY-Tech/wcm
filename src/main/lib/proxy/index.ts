import * as Vorpal from "vorpal";
import { listConfig, getConfig, setConfig } from "../../util/methods/config";
import { logIterator } from "../../util/methods/logging";
import { GlobalConfig } from "../config/index";
import { ProxyConfig } from "./config";

export default function(vorpal: Vorpal) {
  vorpal
    .command("proxy config list", "List the current config for the proxy")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await listConfig<ProxyConfig>()
        .map(logIterator(this, "%s: %s"))
        .run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal
    .command("proxy config get <key>", "Get a config value for the proxy")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await getConfig<ProxyConfig>(args.key)
        .map(this.log)
        .run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal
    .command("proxy config set <key> <value>", "Set a config value for the proxy")
    .action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
      await setConfig<ProxyConfig>(args.key, args.value).run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal.command("proxy start", "Start the WCM proxy").action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
    this.log("???");
  });

  vorpal.command("proxy stop", "Stop the WCM proxy").action(async function(this: Vorpal.CommandInstance, args: Vorpal.Args) {
    this.log("???");
  });
}
