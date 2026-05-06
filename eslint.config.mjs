// @ts-check

import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";
import importX from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default defineConfig(
  {
    ignores: ["*.config.*", "dist/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "import-x/order": "error",
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowTernary: true, allowShortCircuit: true },
      ],
      curly: "error",
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "id-denylist": "off",
      "id-match": "off",
      "no-bitwise": "off",
      "no-caller": "error",
      "no-console": [
        "error",
        {
          allow: [
            "log",
            "warn",
            "dir",
            "timeLog",
            "assert",
            "clear",
            "count",
            "countReset",
            "group",
            "groupEnd",
            "table",
            "dirxml",
            "error",
            "groupCollapsed",
            "Console",
            "profile",
            "profileEnd",
            "timeStamp",
            "context",
          ],
        },
      ],
      "no-debugger": "error",
      "no-empty": "error",
      "no-empty-function": "error",
      "no-eval": "error",
      "no-fallthrough": "error",
      "no-new-wrappers": "error",
      "no-underscore-dangle": "off",
      "no-unused-expressions": "off",
      "no-unused-labels": "error",
      radix: "error",
    },
  },
);
