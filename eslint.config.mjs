import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    ".tools/**",
    ".cache/**",
    "test-results/**",
    "playwright-report/**",
    "public/sw.js",
    "supabase/functions/**",
    "next-env.d.ts",
    "admin/**",
  ]),
]);
