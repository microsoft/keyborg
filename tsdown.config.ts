import { defineConfig } from "tsdown";
import pkg from "./package.json";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "es"],
  target: "es2019",

  env: {
    PKG_VERSION: pkg.version,
  },

  fixedExtension: false,

  dts: true,
  sourcemap: true,
});
