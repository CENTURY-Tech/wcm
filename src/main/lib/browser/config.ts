import { TransformOptions } from "babel-core";

import { ConfigTarget } from "../../util/classes/config";

export interface BrowserConfig extends ConfigTarget {
  manifestUrl: string;
  interceptSrc: string;
  interceptDest: string;
  babelTransformOptions: TransformOptions;
  enableLegacySupport: boolean;
  enableOverrideSupport: boolean;
}

export const BrowserConfig: BrowserConfig = {
  manifestUrl: "manifest.json",
  interceptSrc: "bower_components",
  interceptDest: "web_components",
  babelTransformOptions: {
    presets: [
      [
        require("babel-preset-env"),
        {
          targets: {
            browsers: [">0.25%"]
          }
        }
      ]
    ]
  },
  enableLegacySupport: false,
  enableOverrideSupport: false
};
