import * as util from "util";
import * as Vorpal from "vorpal";

export enum LogType {
  WARN,
  ERROR
}

export function formatAlert(vorpal: Vorpal, type: LogType, format: string, ...values: any[]): string {
  let message = "";

  switch (type) {
    case LogType.WARN:
      message += (vorpal as any).chalk.yellow("Warning:");
      break;
    case LogType.WARN:
      message += (vorpal as any).chalk.red("Error:");
      break;
  }

  return message + "\n\n" + (vorpal as any).util.pad(util.format(format, ...values), 80);
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
      vorpal.ui.redraw(util.format(format, ...value));
    }
  };
}
