import * as path from "path";
import * as util from "util";
import { stat, mkdir, writeFile } from "fs";

import { Bundler } from "./Bundler";

export class HTMLBundler extends Bundler {
  public async *execCompilation({ bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.RootName> {
    for (const [ref, contents, filename] of this.rootNames) {
      const outPath = path.resolve(bundleOutDir, filename);

      try {
        await util.promisify(stat)(path.dirname(outPath));
      } catch (err) {
        if (err.code === "ENOENT") {
          await util.promisify(mkdir)(path.dirname(outPath), { recursive: true } as any);
        }
      }

      await util.promisify(writeFile)(outPath, contents("head").html() as string + contents("body").html() as string, "utf8");
      yield [ref, contents, filename];
    }
  }
}
