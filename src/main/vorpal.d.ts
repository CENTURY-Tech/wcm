export interface VorpalCommand {
  [key: string]: any;

  log(message?: any, ...optionalParams: any[]): void;
}
