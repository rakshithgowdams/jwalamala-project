import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
export const loadedEnv = createRequire(require.resolve("next/package.json"))("@next/env").loadEnvConfig(process.cwd());
