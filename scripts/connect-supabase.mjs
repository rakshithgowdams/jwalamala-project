import { readFile, writeFile } from "node:fs/promises";
import { migrationFiles } from "./lib/migrations.mjs";
import { createHash } from "node:crypto";
import { loadedEnv } from "./lib/supabase-env.mjs";
import { buildContentImport, sqlValue } from "./lib/content-import.mjs";

const hash = (s) => createHash("sha256").update(s).digest("hex");
const base = new URL("../supabase/", import.meta.url);
const apply = process.argv.includes("--apply");
let stage = "configuration";
try {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "https://missing.invalid");
  const match = /^([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
  if (!match || url.protocol !== "https:") throw new Error("Use the project's original https://PROJECT_REF.supabase.co URL in .env.");
  if (!token) throw new Error("Add SUPABASE_ACCESS_TOKEN to .env with database read/write access to this project. API keys cannot initialize tables. No changes made.");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey || !anonKey) throw new Error("Configure the server service key and public anon key before setup.");
  const query = async (sql, readOnly = false) => {
    let response;
    try {
      response = await fetch(`https://api.supabase.com/v1/projects/${match[1]}/database/query`, {
        method: "POST",
        headers: {Authorization: `Bearer ${token}`, "Content-Type": "application/json"},
        body: JSON.stringify({query: sql, read_only: readOnly}),
        signal: AbortSignal.timeout(60000),
      });
    } catch { throw new Error("Database management request failed or timed out. Rerun to inspect committed migration history before continuing."); }
    if (!response.ok) throw new Error(`Database management request returned HTTP ${response.status}. Check token permissions and the current setup stage. No automatic retries were issued.`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error("Unexpected management response; setup stopped.");
    return data;
  };
  stage = "inspect existing schema";
  const tables = await query("SELECT tablename FROM pg_tables WHERE schemaname='public'", true);
  const [tracking] = await query("SELECT to_regclass('jwalamala_setup.migrations') IS NOT NULL AS present", true);
  if (tables.length && !tracking.present) throw new Error("Existing public tables have no Jwalamala setup history. Setup stopped to preserve them; reconcile existing migrations before importing.");
  const files = await migrationFiles(new URL("migrations/", base));
  const history = tracking.present ? await query("SELECT name,sha256 FROM jwalamala_setup.migrations", true) : [];
  const applied = new Map(history.map((row) => [row.name, row.sha256]));
  const content = await buildContentImport();
  const steps = await Promise.all(files.map(async (name) => ({name, sql: await readFile(new URL("migrations/" + name, base), "utf8")})));
  steps.push({name: "initial-content-v1", sql: content.sql.replace(/^BEGIN;\n/m, "").replace(/^COMMIT;\n/m, "")});
  for (const step of steps) if (applied.has(step.name) && applied.get(step.name) !== hash(step.sql)) throw new Error(`Applied file changed: ${step.name}. Add a new migration instead of replaying it.`);
  console.log(`${files.length} schema migrations; ${steps.filter((s) => !applied.has(s.name)).length} pending setup steps.`);
  console.log("Content records:", content.counts);
  if (!apply) {
    console.log("Inspection only. Run with --apply to initialize and import; add --activate to switch the app after verification.");
  } else {
    stage = "initialize private setup history";
    await query(`BEGIN; CREATE SCHEMA IF NOT EXISTS jwalamala_setup;
      REVOKE ALL ON SCHEMA jwalamala_setup FROM PUBLIC,anon,authenticated;
      CREATE TABLE IF NOT EXISTS jwalamala_setup.migrations(name text PRIMARY KEY,sha256 text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now());
      REVOKE ALL ON jwalamala_setup.migrations FROM PUBLIC,anon,authenticated; COMMIT;`);
    for (const step of steps) {
      if (applied.has(step.name)) continue;
      stage = step.name;
      // Each migration commits independently; newly added enum values need this boundary.
      // History is committed with its migration, so interrupted runs can safely resume.
      await query(`BEGIN; SET LOCAL lock_timeout='10s'; SET LOCAL statement_timeout='50s';
        SELECT pg_advisory_xact_lock(697125320);
        ${step.sql}
        INSERT INTO jwalamala_setup.migrations(name,sha256) VALUES(${sqlValue(step.name)},${sqlValue(hash(step.sql))}); COMMIT;`);
      console.log(`Applied ${step.name}`);
    }
    stage = "verify persisted content";
    for (const [table, rows] of Object.entries(content.rows)) {
      const ids = rows.filter((row) => row.id).map((row) => row.id);
      if (!ids.length) continue;
      const [result] = await query(`SELECT count(*)::int AS count FROM public.${table} WHERE ${table === "categories" ? `slug IN (${rows.map((r) => sqlValue(r.slug)).join(",")})` : `id IN (${ids.map(sqlValue).join(",")})`}`, true);
      if (result.count !== rows.length) throw new Error(`Persisted record verification failed for ${table}. Demo mode remains unchanged.`);
    }
    const unprotected = await query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity", true);
    if (unprotected.length) throw new Error("A public table is missing row security. Activation stopped.");
    await query("NOTIFY pgrst, 'reload schema'");
    stage = "verify public API reads";
    for (const table of ["categories", "posts", "events", "places"]) {
      const response = await fetch(`${url.origin}/rest/v1/${table}?select=id&limit=1`, {
        headers: {apikey: anonKey, Authorization: `Bearer ${anonKey}`}, signal: AbortSignal.timeout(10000),
      });
      if (!response.ok || !(await response.json()).length) throw new Error(`Public ${table} API is not ready. Retry setup to verify before activating.`);
    }
    console.log("Database content and public API verified. No provider deliveries or accounts were created.");
    if (process.argv.includes("--activate")) {
      stage = "activate database mode";
      const source = loadedEnv.loadedEnvFiles.find((file) => /^\s*NEXT_PUBLIC_DEMO_MODE\s*=/m.test(file.contents));
      const path = source?.path || ".env.local";
      let current = "";
      try { current = await readFile(path, "utf8"); } catch (e) { if (e.code !== "ENOENT") throw e; }
      const line = "NEXT_PUBLIC_DEMO_MODE=false";
      const next = /^\s*NEXT_PUBLIC_DEMO_MODE\s*=/m.test(current)
        ? current.replace(/^\s*NEXT_PUBLIC_DEMO_MODE\s*=.*$/gm, line)
        : current + "\n" + line + "\n";
      await writeFile(path, next);
      console.log("Database mode enabled in the environment file. Restart development or rebuild production to apply it.");
    }
  }
} catch (error) {
  // Our errors are deliberately credential-free; never print remote bodies or connection objects.
  const safe = error instanceof Error && !["TypeError", "SyntaxError"].includes(error.name) ? error.message : "Unexpected setup failure; check configuration without sharing credentials.";
  console.error(`Supabase setup stopped at ${stage}: ${safe}`);
  process.exitCode = 1;
}
