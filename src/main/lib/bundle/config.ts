import { ConfigTarget } from "../../util/classes/Config";

export interface BundleConfig extends ConfigTarget {
  bundleSrcDir: string;
  bundleOutDir: string;
  components: Record<string, string[]>;
}

export const BundleConfig: BundleConfig = {
  bundleSrcDir: "./src",
  bundleOutDir: "./dist",
  components: {}
};
