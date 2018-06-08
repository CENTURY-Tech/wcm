import { Reader } from "monet";
import { ServerConfig } from "./classes/ServerConfig";
import { VorpalCommand } from "../vorpal";

export type ServerReader<T> = Reader<
  { prompt: VorpalCommand; config: ServerConfig },
  T
>;
export const ServerReader = Reader;

export default function(vorpal: any) {
  vorpal
    .command("server start", "Start the WCM proxy")
    .action(async function(this: VorpalCommand, args: any) {
      this.log("???");
    });

  vorpal
    .command("server stop", "Stop the WCM proxy")
    .action(async function(this: VorpalCommand, args: any) {
      this.log("???");
    });
}
