import { ConfigTarget } from "../../util/classes/Config";

export interface BundleConfig extends ConfigTarget {
  bundleSrcDir: string;
  bundleOutDir: string;
  components: Record<string, string[]>;
  minify: boolean;
}

export const BundleConfig: BundleConfig = {
  bundleSrcDir: "./src",
  bundleOutDir: "./dist",
  components: {},
  minify: false,
};
