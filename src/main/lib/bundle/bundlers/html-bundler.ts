import * as path from "path";
import * as util from "util";
import { stat, mkdir, writeFile } from "fs";

import { Bundler } from "./Bundler";

export class HTMLBundler extends Bundler {
  public async *execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.RootName> {
    for (const [ref, filepath] of this.rootNames) {
      const outPath = path.resolve(bundleOutDir, path.relative(bundleSrcDir, filepath));

      const contents = await Bundler.readSource(filepath);

      try {
        await util.promisify(stat)(path.dirname(outPath));
      } catch (err) {
        if (err.code === "ENOENT") {
          await util.promisify(mkdir)(path.dirname(outPath), { recursive: true } as any);
        }
      }

      await util.promisify(writeFile)(outPath, contents("head").html() as string + contents("body").html() as string, "utf8");
      yield [ref, filepath];
    }
  }
}
