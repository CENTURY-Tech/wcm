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
  