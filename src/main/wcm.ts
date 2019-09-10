import * as vorpal from "vorpal";
import browser from "./lib/browser";
import bundle from "./lib/bundle";
import config from "./lib/config";
import migration from "./lib/migration";

export const cli = (new vorpal)
  .history(".wcm_history")
  .use(browser)
  .use(bundle)
  .use(config)
  .use(migration);
