import { Options } from "html-minifier";
import { ConfigTarget } from "../../util/classes/config";

export interface BundleConfig extends ConfigTarget {
  bundleSrcDir: string;
  bundleOutDir: string;
  components: Record<string, string[]>;
  minify: boolean | Options;
  inlineJs: boolean;
}

export const BundleConfig: BundleConfig = {
  bundleSrcDir: "./src",
  bundleOutDir: "./dist",
  components: {},
  minify: false,
  inlineJs: false,
};
