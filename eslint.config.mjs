import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import header from "@tony.ganchev/eslint-plugin-header";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: ["*.config.*", "dist/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    plugins: {
      import: importPlugin,
      header,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-empty-function": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-unused-expressions": [
        "error",
        { allowTernary: true, allowShortCircuit: true },
      ],
      curly: "error",
      eqeqeq: ["error", "smart"],
      "guard-for-in": "error",
      "header/header": [
        1,
        {
          header: {
            commentType: "block",
            lines: [
              "!",
              " * Copyright (c) Microsoft Corporation. All rights reserved.",
              " * Licensed under the MIT License.",
              " ",
            ],
          },
          trailingEmptyLines: {
            minimum: 1
          }
        }
      ],
      "id-denylist": "off",
      "id-match": "off",
      "import/order": "error",
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
