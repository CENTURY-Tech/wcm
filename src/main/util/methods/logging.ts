import * as util from "util";
import * as Vorpal from "vorpal";

export enum LogType {
  INFO,
  WARN,
  ERROR,
  FATAL
}

export function formatAlert(vorpal: Vorpal, type: LogType, format: string, ...values: any[]): string {
  const msg = util.format(format, ...values);
  
  const logger = [
    (vorpal as any).chalk.blue,
    (vorpal as any).chalk.yellow,
    (vorpal as any).chalk.red,
    (vorpal as any).chalk.red
  ][type]

  return msg.split("\n").reduce((msg, line) => {
    switch (type) {
      case LogType.FATAL:
        return `${msg}${logger("┃  ")}${logger.bold(line)}\n`;

      default:
        return `${msg}${logger("┃  ")}${line}\n`;
    }
  }, logger("╻\n")) + logger("╹");
}

/**
 * Log each item in an iterator or generator.
 */
export function logIterator(prompt: Vorpal.CommandInstance, format: string): (iterator: IterableIterator<any>) => void {
  return iterator => {
    for (const value of iterator) {
      prompt.log(format, ...value);
    }
  };
}

/**
 * Log each item in an asynchronous iterator or generator.
 */
export function logAsyncIterator(prompt: Vorpal.CommandInstance, format: string): (iterator: AsyncIterableIterator<any>) => Promise<void> {
  return async iterator => {
    for await (const value of iterator) {
      prompt.log(format, ...value);
    }
  };
}

export function displayProgress(vorpal: Vorpal, format: string): (iterator: AsyncIterableIterator<any>) => Promise<void> {
  return async iterator => {
    for await (const value of iterator) {
      if (value.constructor === Error) {
        vorpal.ui.redraw.clear();
        vorpal.ui.redraw.done();

        vorpal.log(formatAlert(vorpal, LogType.ERROR, value.message));
      } else {
        vorpal.ui.redraw(util.format(format, ...value));
      }
    }
  };
}
