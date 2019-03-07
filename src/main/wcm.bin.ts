#!/usr/bin/env node

import { cli } from "./wcm";
import { formatAlert, LogType } from "./util/methods/logging";

(cli as any).on("client_command_error", () => {
  cli.log(formatAlert(cli, LogType.FATAL, ""
    + "How embarassing, this was unexpected... Please report this error!"
  ));

  process.exit(1);
})

if (!module.parent) {
  if ((process.argv[0].endsWith("wcm") && process.argv.length > 1) || (process.argv[0].endsWith("node") && process.argv.length > 2)) {
    cli.log(formatAlert(cli, LogType.WARN, ""
      + "Running WCM in single-command mode is perfect for single tasks, but less\n"
      + "performant than running in batch mode during development."
    ));

    cli.parse(process.argv);
  } else {
    cli.delimiter("wcm>").show();
  }
}
