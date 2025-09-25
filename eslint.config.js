// Flat ESLint config for ESLint v9+
// See: https://eslint.org/docs/latest/use/configure/configuration-files-new
import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  // Ignores
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "packages/**/dist/**",
      "**/*.d.ts"
    ],
  },
  // Base JS rules
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  // TypeScript recommended
  ...tseslint.configs.recommended,
  // Enable type-aware rules for TS files (optional but helpful)
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  // React ecosystem plugins
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  }
);
