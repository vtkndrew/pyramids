import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import prettier from "eslint-config-prettier/flat";
import globals from "globals";

export default defineConfig([
  globalIgnores([
    "**/node_modules/**",
    "dist/**",
    "coverage/**",
    "test-results/**",
    "test-results-pwa/**",
    "playwright-report/**",
  ]),
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: [
      "*.{js,ts}",
      "scripts/**/*.mjs",
      "e2e/**/*.ts",
      "pwa-tests/**/*.ts",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    // Playwright callbacks execute in the browser, while their harness uses Node.
    files: ["e2e/**/*.ts", "pwa-tests/**/*.ts", "scripts/generate-icons.mjs"],
    languageOptions: { globals: globals.browser },
  },
  prettier,
]);
