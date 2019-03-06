import { Reader } from "monet";

import { Config, ConfigTarget } from "./classes/config";

export type ConfigReader<E extends ConfigTarget, A> = Reader<Config<E>, A>;
export const ConfigReader = <E extends ConfigTarget, A>(fn: (env: Config<E>) => A) => Reader<Config<E>, A>(fn);

export type CombinedConfigReader<E extends ConfigTarget[], A> = Reader<ConfigList<E>, A>;
export const CombinedConfigReader = <E extends ConfigTarget[], A>(fn: (env: ConfigList<E>) => A) => Reader<ConfigList<E>, A>(fn);

export type ConfigList<E extends ConfigTarget[]> =
  E extends [infer E1] ? [Config<E1>] :
  E extends [infer E1, infer E2] ? [Config<E1>, Config<E2>] :
  E extends [infer E1, infer E2, infer E3] ? [Config<E1>, Config<E2>, Config<E3>] : never
