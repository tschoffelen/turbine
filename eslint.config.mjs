import eslint from "@eslint/js";
import { globalIgnores } from "eslint/config";
import * as importPlugin from "eslint-plugin-import";
import pluginJest from "eslint-plugin-jest";
import noOnlyTests from "eslint-plugin-no-only-tests";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  eslintPluginPrettierRecommended,
  pluginJest.configs["flat/recommended"],
  [
    globalIgnores([
      "**/node_modules/",
      "**/.history/",
      "**/.next/",
      "**/.git/",
      "**/.turbo/",
      "**/.serverless/",
      "**/coverage/",
      "**/dist/",
      "prompts/**/*.hbs",
      "**/_compiled_prompts.js",
    ]),
    {
      files: ["**/*.{js,jsx,ts,tsx}"],
      plugins: {
        import: importPlugin,
        "no-only-tests": noOnlyTests,
      },
      languageOptions: {
        ecmaVersion: 2020,
        parserOptions: {
          ecmaFeatures: {
            jsx: true,
          },
        },
      },
      settings: {
        react: {
          version: "detect",
        },
      },
      rules: {
        "prettier/prettier": "warn",
        "no-prototype-builtins": "off",
        "no-empty-pattern": "warn",
        "no-only-tests/no-only-tests": "error",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-function-type": "warn",
        "@typescript-eslint/ban-ts-comment": "warn",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            varsIgnorePattern: "React|^_",
            argsIgnorePattern: "^_",
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
          },
        ],
        "import/order": [
          "warn",
          {
            alphabetize: { order: "asc" },
            groups: [
              "builtin",
              "external",
              ["internal", "parent", "sibling", "index"],
            ],
            "newlines-between": "always",
            distinctGroup: true,
            pathGroupsExcludedImportTypes: ["builtin"],
          },
        ],
        "no-multiple-empty-lines": "warn",
      },
    },
  ],
);
