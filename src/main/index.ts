import * as Vorpal from "./vorpal.js";
import parser from "./parser";
import server from "./server";

(Vorpal as any)()
  .use(parser)
  .use(server)
  .delimiter("wcm>")
  .show();
