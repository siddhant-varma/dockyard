import nextPlugin from "@next/eslint-plugin-next";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/** @type {import("eslint").Linter.Config[]} */
export default [
  /* TypeScript strict rules */
  ...tseslint.configs.strict,

  /* React */
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs["jsx-runtime"].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      "react/prop-types": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },

  /* Next.js */
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
    },
  },

  /* Project rules */
  {
    rules: {
      /* No debug statements in committed code */
      "no-console": ["error", { allow: ["warn", "error"] }],

      /* No duplicate imports */
      "no-duplicate-imports": "error",

      /* Allow unused vars prefixed with _ */
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /* Ignore patterns */
  {
    ignores: [
      ".next/",
      "node_modules/",
      "out/",
      "dist/",
      "coverage/",
    ],
  },
];
