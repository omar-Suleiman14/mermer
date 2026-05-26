import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import convexPlugin from "@convex-dev/eslint-plugin";

const convexRecommendedRules =
  convexPlugin.configs.recommended.overrides?.[0]?.rules ?? {};

export default defineConfig([
  globalIgnores([
    ".next/**",
    "build/**",
    "coverage/**",
    "dist/**",
    "node_modules/**",
    "out/**",
    "convex/_generated/**",
    "next-env.d.ts",
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
  {
    files: ["convex/**/*.ts"],
    plugins: {
      "@convex-dev": convexPlugin,
    },
    rules: convexRecommendedRules,
  },
]);
