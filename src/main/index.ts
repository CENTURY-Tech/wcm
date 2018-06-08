import browser from "./lib/browser.js";
import config from "./lib/config";
import migration from "./lib/migration";
import server from "./lib/proxy";

/**
 * Until Vorpal either supports, or provides definitions for Typescript, this
 * hack is in place to import the library.
 */
export const cli = require("vorpal")()
  .history(".wcm_history")
  .use(browser)
  .use(config)
  .use(migration)
  .use(server);

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
