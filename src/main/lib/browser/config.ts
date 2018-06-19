import { TransformOptions } from "babel-core";

export interface BrowserConfig {
  manifestUrl: string;
  interceptSrc: string;
  interceptDest: string;
  babelTransformOptions: TransformOptions;
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
  }
};
