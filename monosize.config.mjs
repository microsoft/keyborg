// @ts-check

import createAzureStorage from "monosize-storage-azure";
import path from "path";
import webpackBundler from "monosize-bundler-webpack";

const dirname = new URL(".", import.meta.url).pathname;

/** @type {import('monosize').MonoSizeConfig} */
const config = {
  repository: "https://github.com/microsoft/keyborg",
  storage: createAzureStorage({
    authType: 'AzurePipelinesCredential',
    endpoint: 'https://fluent-bundlesize.azurewebsites.net/api/keyborglatest',
    tableName: 'keyborglatest',
  }),
  bundler: webpackBundler((config) => {
    config.resolve = {
      alias: {
        keyborg: path.resolve(dirname, "dist", "esm", "index.js"),
      },
    };
    return config;
  }),
};

export default config;
