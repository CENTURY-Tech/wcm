import { VorpalCommand } from "../vorpal";
import { listConfig, getConfig, setConfig } from "../util/methods/config";
import { logIterator } from "../util/methods/logging";
import { GlobalConfig } from "./config";

export interface ProxyConfig {
  host: string;
  port: number;
}

export default function(vorpal: any) {
  vorpal
    .command("proxy config list", "List the current config for the proxy")
    .alias("proxy config-list", "proxy list-config")
    .action(async function(this: VorpalCommand, args: any) {
      await listConfig<ProxyConfig>()
        .map(logIterator(this, "%s: %s"))
        .run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal
    .command("proxy config get <key>", "Get a config value for the proxy")
    .alias("proxy config-get", "proxy get-config")
    .action(async function(this: VorpalCommand, args: any) {
      await getConfig<ProxyConfig>(args.key)
        .map(this.log)
        .run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal
    .command("proxy config set <key> <value>", "Set a config value for the proxy")
    .alias("proxy config-set", "proxy set-config")
    .action(async function(this: VorpalCommand, args: any) {
      await setConfig<ProxyConfig>(args.key, args.value).run(GlobalConfig.proxy.getOrCreateInstance());
    });

  vorpal.command("proxy start", "Start the WCM proxy").action(async function(this: VorpalCommand, args: any) {
    this.log("???");
  });

  vorpal.command("proxy stop", "Stop the WCM proxy").action(async function(this: VorpalCommand, args: any) {
    this.log("???");
  });
}
