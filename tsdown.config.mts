import { defineConfig, type UserConfig } from "tsdown";
import pkg from "./package.json" with { type: "json" };

const config = {
  format: ["cjs", "es"],
  target: "es2022",

  env: {
    PKG_VERSION: pkg.version,
  },

  fixedExtension: false,

  dts: true,
  sourcemap: true,
} satisfies UserConfig;

export default defineConfig([
  { ...config, entry: ["src/index.mts"] },
  {
    ...config,
    entry: { compatibility: "src/compat.mts" },
    clean: false,
  },
]);
