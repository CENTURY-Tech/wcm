import * as path from "path";
import { CompilerOptions, ModuleKind, ScriptTarget } from "typescript";

import { Bundler } from "./Bundler";

// We're only interested in the local instalation of Typescript, nothing else!
const ts = require(require.resolve("typescript", { paths: [process.cwd()] }));

export class TSBundler extends Bundler {
  constructor(
    public compilerOptions: CompilerOptions = require(require.resolve("tsconfig.json", { paths: [process.cwd()] })).compilerOptions,
    public rootNames: Bundler.RootName[] = []
  ) {
    super(rootNames);
  }

  public *execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>) {
    const program = ts.createProgram(this.rootNames.map(([, _]) => path.resolve(bundleSrcDir, _)), {
      ...this.compilerOptions,

      rootDir: bundleSrcDir,
      outDir: bundleOutDir,

      module:
        !this.compilerOptions.module ||
        ({
          none: 0,
          commonjs: 1,
          amd: 2,
          umd: 3,
          system: 4,
          es2015: 5,
          esnext: 6
        } as Record<string, ModuleKind>)[(this.compilerOptions.module as any).toLowerCase()],

      target:
        !this.compilerOptions.target ||
        ({
          es3: 0,
          es5: 1,
          es2015: 2,
          es2016: 3,
          es2017: 4,
          es2018: 5,
          esnext: 6
        } as Record<string, ScriptTarget>)[(this.compilerOptions.target as any).toLowerCase()],

      /**
       *
       */
      lib: !this.compilerOptions.lib || this.compilerOptions.lib.map(lib => `lib.${lib}.d.ts`)
    });

    let diagnostics;

    diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length) {
      return diagnostics.forEach(TSBundler.reportDiagnostic);
    }

    diagnostics = program.emit().diagnostics;

    if (diagnostics.length) {
      diagnostics.forEach(TSBundler.reportDiagnostic);
    }

    for (const [ref, filename] of this.rootNames) {
      ref && ref.attr("src", replaceExt(ref.attr("src"), ".js"));
      yield [ref, filename];
    }
  }

  private static reportDiagnostic({ file, messageText, start }: any) {
    const message = ts.flattenDiagnosticMessageText(messageText, "\n");

    if (file) {
      const { line, character } = file.getLineAndCharacterOfPosition(start);
      console.log("%s (%d,%d): %s", file.fileName, line + 1, character + 1, message);
    } else {
      console.log("%s: %s", message);
    }
  }
}

function replaceExt(target: string, ext: string) {
  return path.join(path.dirname(target), path.basename(target, path.extname(target)) + ext);
}
