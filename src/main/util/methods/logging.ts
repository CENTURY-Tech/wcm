import * as util from "util";
import { VorpalCommand } from "../../vorpal";

export enum LogType {
  WARN,
  ERROR
}

export function formatAlert(vorpal: any, type: LogType, format: string, ...values: any[]): string {
  let message = "";

  switch (type) {
    case LogType.WARN:
      message += vorpal.chalk.yellow("Warning:");
      break;
    case LogType.WARN:
      message += vorpal.chalk.red("Error:");
      break;
  }

  return message + "\n\n" + vorpal.util.pad(util.format(format, ...values), 80);
}

/**
 * Log each item in an iterator or generator.
 */
export function logIterator(prompt: VorpalCommand, format: string): (iterator: IterableIterator<any>) => void {
  return iterator => {
    for (const value of iterator) {
      prompt.log(format, ...value);
    }
  };
}

/**
 * Log each item in an asynchronous iterator or generator.
 */
export function logAsyncIterator(prompt: VorpalCommand, format: string): (iterator: AsyncIterableIterator<any>) => Promise<void> {
  return async iterator => {
    for await (const value of iterator) {
      prompt.log(format, ...value);
    }
  };
}

export function displayProgress(vorpal: any, format: string): (iterator: AsyncIterableIterator<any>) => Promise<void> {
  return async iterator => {
    for await (const value of iterator) {
      vorpal.ui.redraw(util.format(format, ...value));
    }
  };
}
