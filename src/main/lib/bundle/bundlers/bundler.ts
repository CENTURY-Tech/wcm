import * as path from "path";
import * as util from "util";
import { readFile, writeFile, unlink } from "fs"
import { load } from "cheerio";
import { MemoizeProcedure } from "../../../util/decorators/memoize-procedure";
import { BundleConfig } from "../config";

const minify: any = require("minify");

const readFileAsync = util.promisify(readFile);
const writeFileAsync = util.promisify(writeFile);
const unlinkAsync = util.promisify(unlink);

/**
 * A
 */
const ignorePaths: Set<string> = new Set;

export abstract class Bundler {
  constructor(
    public rootNames: Bundler.RootName[] = []
  ) {}

  public addRootName(rootName: Bundler.RootName) {
    this.rootNames.push(rootName);
  }

  public abstract execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.ProcessedRootName>

  static async finalize([[ref, filepath], contents]: Bundler.ProcessedRootName, config: BundleConfig): Promise<void> {
    if (config.inlineJs && filepath.endsWith(".js") && ref) {
      ref.replaceWith(load(`<script>${contents}</script>`).html());
      return unlinkAsync(filepath);
    }

    if (config.minify) {
      contents = minify[path.extname(filepath).slice(1)](contents);
    }

    return Bundler.writeFile(filepath, contents);
  }

  @MemoizeProcedure
  static async *walkSource(filepath: string): AsyncIterableIterator<Bundler.RootName> {
    const $ = await Bundler.readSource(filepath);

    for (const elem of $("wcm\\:ignore[path]").toArray()) {
      const lookupPath = path.resolve(path.dirname(filepath), elem.attribs.path);
      $(elem).remove();

      if (!ignorePaths.has(lookupPath)) {
        ignorePaths.add(lookupPath);
      }
    }

    for (const elem of $("wcm\\:import[path]").toArray()) {
      const lookupPath = path.resolve(path.dirname(filepath), elem.attribs.path);
      $(elem).remove();

      if (!ignorePaths.has(lookupPath)) {
        yield [null, lookupPath];
      }
    }
  
    for (const elem of $('link[rel="import"]').toArray()) {
      const lookupPath = path.resolve(path.dirname(filepath), $(elem).attr("href"));

      if (!ignorePaths.has(lookupPath)) {
        yield [$(elem), lookupPath];
      } else {
        $(elem).remove();
      }
    }
  
    for (const elem of $('script[src]').toArray()) {
      const lookupPath = path.resolve(path.dirname(filepath), $(elem).attr("src"));

      if (!ignorePaths.has(lookupPath)) {
        yield [$(elem), lookupPath];
      } else {
        $(elem).remove();
      }
    }
  }

  @MemoizeProcedure
  static async readSource(filepath: string): Promise<CheerioStatic> {
    if (!filepath.endsWith(".html")) {
      throw Error(`File extension is not .html: ${filepath}`);
    }
    
    return load(await Bundler.readFile(filepath));
  }

  @MemoizeProcedure
  static readFile(filepath: string): Promise<string> {
    if (!path.isAbsolute(filepath)) {
      throw Error(`Filepath is not absolute: ${filepath}`);
    }

    return readFileAsync(filepath, "utf8");
  }

  static writeFile(filepath: string, contents: string): Promise<void> {
    if (!path.isAbsolute(filepath)) {
      throw Error(`Filepath is not absolute: ${filepath}`);
    }

    return writeFileAsync(filepath, contents, "utf8");
  }

  @MemoizeProcedure
  static async extractContentsFromSource(filepath: string): Promise<string> {
    return Bundler.extractContentsFromStatic(await Bundler.readSource(filepath));
  }

  static async extractContentsFromStatic($: CheerioStatic): Promise<string> {
    return $("head").html() as string + $("body").html() as string;
  }
}

export namespace Bundler {
  export type RootName = [Cheerio | null, string];
  export type ProcessedRootName = [RootName, string];
}
