import * as path from "path";
import { pathExists, readJson } from "fs-extra";
import { CaseClass } from "../decorators/CaseClass";
import { MemoizeProcedure } from "../decorators/MemoizeProcedure";

export class Dependency extends CaseClass(
  class {
    constructor(
      public dirname: string,
      public packageFilepath: string,
      public packageNameLookupPath: string,
      public packageVersionLookupPath: string,
      public packageDependenciesLookupPath: string
    ) {}
  }
) {
  @MemoizeProcedure
  async getPackageFile(): Promise<Record<string, any>> {
    for (const filepath of this.packageFilepath.split(",")) {
      if (await pathExists(path.join(this.dirname, filepath))) {
        return readJson(path.join(this.dirname, filepath));
      }
    }

    throw Error(`Could not find package file in "${path.resolve(this.dirname)}"`);
  }

  getName(): Promise<string> {
    return this.getPackageFile().then(pkg => pkg[this.packageNameLookupPath]);
  }

  getDependencies(): Promise<Record<string, string>> {
    return this.getPackageFile().then(pkg => pkg[this.packageDependenciesLookupPath]);
  }

  getVersion(): Promise<string> {
    return this.getPackageFile().then(pkg => pkg[this.packageVersionLookupPath]);
  }
}
