import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Allow intentionally-unused params/vars prefixed with underscore
      // (e.g. interface-mandated signatures, reserved API params).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Typing debt only — no runtime impact. Tracked separately.
      "@typescript-eslint/no-explicit-any": "warn",
      // react-hooks v7 compiler-style strictness rules: valid today, tracked
      // as refactor work — downgraded so genuine correctness stays visible.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/refs": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node tooling scripts (CommonJS, not part of the app bundle):
    "scripts/**",
    "db/**",
    "next-types.d.ts",
    // Root-level one-off verification/audit scratch scripts (not part of
    // the production application; CommonJS require-style by design):
    "*.js",
    "*.cjs",
    "*.mts",
    "!next.config.*",
    // Non-production data/backup artifacts:
    "market-data/**",
    "verified/**",
    "no-match/**",
    ".backup-outlet-batch1/**",
    // Temp scripts (CommonJS scratch/audit scripts, not part of the app):
    "tmp/**",
  ]),
]);

export default eslintConfig;
