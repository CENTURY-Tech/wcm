import { ParserConfig } from '../classes/ParserConfig';
import { ParserReader } from '..';

/**
 * List the currently stored configuration.
 */
export function configList(): ParserReader<void> {
  return ParserReader(({prompt, config}) => {
    for (const key of ParserConfig.assignableKeys) {
      prompt.log('%s: %s', key, config[key])
    }
  })
}

/**
 * Print the configured value store for the supplied key, or print an error if
 * the key is not valid.
 * 
 * @param key 
 */
export function configGet(key: keyof ParserConfig): ParserReader<void> {
  return ParserReader(({prompt, config}) => {
    prompt.log(config[key])
  })
}

/**
 * Persist the configuration value for the supplied key, or print an error if
 * the key is not valid.
 * 
 * @param key 
 * @param value 
 */
export function configSet(key: keyof ParserConfig, value: string): ParserReader<void> {
  return ParserReader(({config}) => {
    config[key] = value
  })
}
