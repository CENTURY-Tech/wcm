import { ParserReader } from "../";

/**
 * List the project dependencies.
 */
export function depsList(): ParserReader<void> {
  return ParserReader(({ prompt, config }) => {
    prompt.log("???");
  });
}

/**
 * Scan the project dependencies.
 */
export function depsScan(): ParserReader<void> {
  return ParserReader(({ prompt, config }) => {
    prompt.log("???");
  });
}
