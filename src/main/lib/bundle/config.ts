export interface BundleConfig {
  bundleSrcDir: string;
  bundleOutDir: string;
  components: Record<string, string[]>;
}

export const BundleConfig: BundleConfig = {
  bundleSrcDir: "./src",
  bundleOutDir: "./dist",
  components: {}
};
