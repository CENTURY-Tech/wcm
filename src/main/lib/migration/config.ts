import { ConfigTarget } from "../../util/classes/config";

export interface MigrationConfig extends ConfigTarget {
  depsRootDir: string;
  depsOutDir: string;
  packageFile: string;
  packageLookupName: string;
  packageLookupDependencies: string;
  packageLookupVersion: string;
}

export const MigrationConfig: MigrationConfig = {
  depsRootDir: "node_modules",
  depsOutDir: "web_components",
  packageFile: "package.json",
  packageLookupName: "name",
  packageLookupDependencies: "dependencies",
  packageLookupVersion: "version"
};
