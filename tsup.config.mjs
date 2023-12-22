// @ts-check

import { defineConfig } from "tsup";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  target: "es2019",
  legacyOutput: true,

  env: {
    PKG_VERSION: pkg.version,
  },

  clean: true,
  dts: true,
  splitting: false,
  sourcemap: true,
});
