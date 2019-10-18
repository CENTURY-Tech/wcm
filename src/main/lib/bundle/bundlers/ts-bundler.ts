import * as path from "path";
import * as util from "util";
import { CompilerOptions, ModuleKind, ScriptTarget } from "typescript";

import { Loggable, LogType } from "../../../util/methods/logging";
import { Bundler } from "./bundler";

// We're only interested in the local instalation of Typescript, nothing else!
const ts = require(require.resolve("typescript", { paths: [process.cwd()] }));

export class TSBundler extends Bundler {
  constructor(
    public compilerOptions: CompilerOptions = TSBundler.getCompilerOptions(),
    public rootNames: Bundler.RootName[] = []
  ) {
    super(rootNames);
  }

  public async *execCompilation({ bundleSrcDir, bundleOutDir }: Record<string, string>): AsyncIterableIterator<Bundler.ProcessedRootName | Loggable> {
    const program = ts.createProgram(this.rootNames.map(([, _]) => _), {
      ...this.compilerOptions,

      rootDir: bundleSrcDir,
      outDir: bundleOutDir,
    });

    let diagnostics;

    diagnostics = ts.getPreEmitDiagnostics(program);

    if (diagnostics.length) {
      const warnings = [];
      const errors = [];

      for (const diagnostic of diagnostics) {
        if (diagnostic.reportsUnnecessary) {
          warnings.push(diagnostic);
        } else {
          errors.push(diagnostic);
        }
      }

      if (warnings.length) {
        yield new Loggable(warnings.map(TSBundler.reportDiagnostic).join("\n"), LogType.WARN);
      }

      if (errors.length) {
        yield new Loggable(errors.map(TSBundler.reportDiagnostic).join("\n"), LogType.ERROR);

        // Return early, The TS won't compile!
        return;
      }
    }

    diagnostics = program.emit().diagnostics;

    if (diagnostics.length) {
      for (const diagnostic of diagnostics) {
        yield new Loggable(TSBundler.reportDiagnostic(diagnostic), LogType.WARN);
      }
    }

    for (let [ref, filepath] of this.rootNames) {
      ref && ref.attr("src", replaceExt(ref.attr("src"), ".js"));
      filepath = replaceExt(filepath.replace(bundleSrcDir, bundleOutDir), ".js")
      yield [[ref, filepath], await Bundler.readFile(filepath)];
    }
  }

  private static getCompilerOptions(): CompilerOptions {
      let parsedConfig: any;

      parsedConfig = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
      parsedConfig = ts.parseJsonConfigFileContent(parsedConfig.config, ts.sys, process.cwd());

      return parsedConfig.options;
  }

  private static reportDiagnostic({ file, messageText, start }: any): string {
    const message = ts.flattenDiagnosticMessageText(messageText, "\n");

    if (file) {
      const { line, character } = file.getLineAndCharacterOfPosition(start);
      return util.format("%s (%d,%d): %s", file.fileName, line + 1, character + 1, message);
    } else {
      return util.format("%s", message);
    }
  }
}

function replaceExt(target: string, ext: string) {
  return path.join(path.dirname(target), path.basename(target, path.extname(target)) + ext);
}
