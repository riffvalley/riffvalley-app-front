import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "src/**",
      "!src/app/**",
      "!src/modules/**",
      "!src/shared/**",
      "!src/integrations/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["commitlint.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { module: "readonly" },
    },
  },
  {
    files: ["src/app/**/*.{ts,vue}", "src/modules/**/*.{ts,vue}", "src/shared/**/*.{ts,vue}", "src/integrations/**/*.{ts,vue}"],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}", "tests/**/*.ts", "*.config.{js,mjs,cjs}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
);
