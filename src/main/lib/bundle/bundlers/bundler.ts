export abstract class Bundler {
  constructor(
    public rootNames: Bundler.RootName[] = []
  ) {}

  public addRootName(rootName: Bundler.RootName) {
    this.rootNames.push(rootName);
  }

  public abstract execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.RootName>
}

export namespace Bundler {
  export type RootName = [Cheerio, CheerioStatic, string];
}
