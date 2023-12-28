// @ts-check

import createAzureStorage from "monosize-storage-azure";
import path from "path";

const dirname = new URL(".", import.meta.url).pathname;

/** @type {import('monosize').MonoSizeConfig} */
const config = {
  repository: "https://github.com/microsoft/keyborg",
  storage: createAzureStorage({
    endpoint: "https://keyborg-bundlesize.azurewebsites.net/api/latest",
  }),
  webpack(config) {
    config.resolve = {
      alias: {
        keyborg: path.resolve(dirname, "dist", "esm", "index.js"),
      },
    };

    return config;
  },
};

export default config;
