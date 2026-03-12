// @ts-check

import gitStorage from "monosize-storage-git";
import path from "path";
import webpackBundler from "monosize-bundler-webpack";

const dirname = new URL(".", import.meta.url).pathname;

/** @type {import('monosize').MonoSizeConfig} */
const config = {
  repository: "https://github.com/microsoft/keyborg",
  storage: gitStorage({
    owner: "microsoft",
    repo: "keyborg",
    workflowFileName: "bundle-size-base.yml",
    outputPath: path.resolve(dirname, "monosize-report.json"),
  }),
  bundler: webpackBundler((config) => {
    config.resolve = {
      alias: {
        keyborg: path.resolve(dirname, "dist", "index.js"),
      },
    };
    return config;
  }),
};

export default config;
