import { Reader } from "monet";
import { Config } from "./classes/Config";

export type ConfigReader<E, A> = Reader<Config<E>, A>;
export const ConfigReader = Reader;

export type AsyncConfigReader<E, A> = ConfigReader<E, Promise<A>>;
export const AsyncConfigReader = Reader;
