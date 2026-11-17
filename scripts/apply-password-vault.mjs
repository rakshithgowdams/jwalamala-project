import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(filePath) {
  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[match[1]]) process.env[match[1]] = value;
  }
}

loadEnv(resolve(root, "admin/.env.local"));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.DATABASE_URL ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL;

if (!url || !key) {
  console.error("Missing Supabase URL or service role key");
  process.exit(1);
}

const sql = readFileSync(
  resolve(root, "supabase/migrations/20261117100000_admin_password_vault.sql"),
  "utf8",
);

if (dbUrl) {
  const { default: pg } = await import("pg").catch(() => ({ default: null }));
  if (!pg) {
    console.error("pg package missing; cannot apply via DATABASE_URL");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Applied via DATABASE_URL");
  process.exit(0);
}

// Fallback: verify whether the table already exists through the API.
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { error } = await db.from("admin_password_vault").select("id").limit(1);
if (!error) {
  console.log("Table already exists");
  process.exit(0);
}
console.error(
  "Table missing and no DATABASE_URL. Run supabase/migrations/20261117100000_admin_password_vault.sql in the Supabase SQL Editor.",
);
console.error(error.message);
process.exit(2);
