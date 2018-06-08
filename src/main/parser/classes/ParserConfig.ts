let parserConfigInstance: ParserConfig

export class ParserConfig {
  public 'basepath' = 'foo'

  /**
   * Retrieve the `parserConfigInstance` singleton or create and assign a new one if required.
   */
  static getOrCreate(config: Partial<ParserConfig> = {}) {
    if (!parserConfigInstance) {
      parserConfigInstance = new ParserConfig(config)
    }
  
    return parserConfigInstance
  }

  static assignableKeys: Array<keyof ParserConfig> = [
    'basepath'
  ]

  constructor(config: Partial<ParserConfig>) {
    Object.assign(this, config)
  }
}
