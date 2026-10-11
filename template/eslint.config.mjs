import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    // Generated output is never hand-authored source.
    ignores: [
      "node_modules/",
      "results/",
      "dist/",
      ".features-gen/",
      "test-artifacts/",
      "test-results/",
      "playwright-report/",
    ],
  },
  {
    // Tooling scripts run on Node; give them the globals they use.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
    },
  },
  {
    // Allow intentionally-unused args/vars when prefixed with `_`.
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);
