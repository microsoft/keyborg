// @ts-check

import path from "path";

const dirname = new URL(".", import.meta.url).pathname;

/** @type {import('monosize').MonoSizeConfig} */
const config = {
  repository: "https://github.com/microsoft/keyborg",
  webpack(config) {
    config.resolve = {
      alias: {
        keyborg: path.resolve(dirname, "dist", "keyborg.esm.js"),
      },
    };

    return config;
  },
};

export default config;
