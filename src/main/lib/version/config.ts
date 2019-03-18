import { ConfigTarget } from "../../util/classes/Config";
import { Manifest } from "../browser";

export interface VersionConfig extends ConfigTarget {
  manifestData: Manifest;
  manifestPath: string;
}

export const VersionConfig: VersionConfig = {
  get manifestData() {
    return require(this.manifestPath)
  },
  
  manifestPath: require.resolve("manifest.json", { paths: [process.cwd()] }),
};
