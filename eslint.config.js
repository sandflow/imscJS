import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "src/test/webapp/**/*",
      "dist",
      "build",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        QUnit: true,
        tests: true,
      },
    },
    rules: {
      "no-var": "error",
      "prefer-const": "error",
      "quotes": ["error", "double", { "avoidEscape": true, "allowTemplateLiterals": true }],
      "no-trailing-spaces": "error",
      "no-multiple-empty-lines": ["error", { "max": 1 }],
      "comma-dangle": ["error", "always-multiline"],
      "eol-last": ["error", "always"],
    },
  },
];
