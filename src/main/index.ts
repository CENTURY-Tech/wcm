#!/usr/bin/env node

import * as vorpal from "vorpal";
import browser from "./lib/browser";
import bundle from "./lib/bundle";
import config from "./lib/config";
import install from "./lib/install";
import migration from "./lib/migration";
import proxy from "./lib/proxy";

export const cli = (new vorpal)
  .history(".wcm_history")
  .use(browser)
  .use(bundle)
  .use(config)
  .use(install)
  .use(migration)
  .use(proxy);

(cli as any).on("client_command_error", () => {
  console.log("\nHow embarassing, this wasn't meant to happen... Please report this error!\n");
  process.exit(1);
})

if (!module.parent) {
  if ((process.argv[0].endsWith("wcm") && process.argv.length > 1) || (process.argv[0].endsWith("node") && process.argv.length > 2)) {
    cli.log(`Warning:\n
      Running WCM in single-command mode is perfect for single tasks, but less
      performant than running in batch mode during development.
    `);

    cli.parse(process.argv);
  } else {
    cli.delimiter("wcm>").show();
  }
}
