import * as path from "path";
import * as util from "util";
import { readFile } from "fs"
import { load } from "cheerio";
import { MemoizeProcedure } from "../../../util/decorators/memoize-procedure";

export abstract class Bundler {
  constructor(
    public rootNames: Bundler.RootName[] = []
  ) {}

  public addRootName(rootName: Bundler.RootName) {
    this.rootNames.push(rootName);
  }

  public abstract execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.RootName>

  @MemoizeProcedure
  static async *walkSource(filepath: string): AsyncIterableIterator<Bundler.RootName> {
    const $ = await Bundler.readSource(filepath);
  
    for (const elem of $('link[rel="import"]').toArray()) {
      yield [$(elem), path.resolve(path.dirname(filepath), $(elem).attr("href"))];
    }
  
    for (const elem of $('script[src]').toArray()) {
      yield [$(elem), path.resolve(path.dirname(filepath), $(elem).attr("src"))];
    }
  }

  @MemoizeProcedure
  static async readSource(filepath: string): Promise<CheerioStatic> {
    if (!path.isAbsolute(filepath)) {
      throw Error(`Filepath is not absolute: ${filepath}`);
    }

    if (!filepath.endsWith(".html")) {
      throw Error(`File extension is not .html: ${filepath}`);
    }
    
    return load(await util.promisify(readFile)(filepath, "utf8"))
  }
}

export namespace Bundler {
  export type RootName = [Cheerio | null, string];
}
