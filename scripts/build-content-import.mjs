import { writeFile, mkdir } from "node:fs/promises";
import { buildContentImport } from "./lib/content-import.mjs";
const { sql, counts } = await buildContentImport();
const folder = new URL("../supabase/release/", import.meta.url);
await mkdir(folder, {recursive: true});
await writeFile(new URL("03-content.sql", folder), sql);
await writeFile(new URL("content-manifest.json", folder), JSON.stringify(counts, null, 2) + "\n");
console.log("Prepared content import (no remote database changes):", counts);
