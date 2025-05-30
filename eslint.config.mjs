import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.js"], languageOptions: { sourceType: "script", ecmaVersion: 5 } },
  { files: ["**/*.{js,mjs,cjs}"], languageOptions: { globals: globals.browser, ecmaVersion: 5 } },
  {
    rules: {
      "no-unused-vars": "warn",
      "no-redeclare": "warn",
      "no-empty": "warn",
    }
  }
]);
