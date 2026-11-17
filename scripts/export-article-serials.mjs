import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
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
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const pageSize = 1000;
let from = 0;
const rows = [];

while (true) {
  const to = from + pageSize - 1;
  const { data, error } = await db
    .from("posts")
    .select("id,title_kn,status,type,created_at,slug")
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!data?.length) break;
  rows.push(...data);
  if (data.length < pageSize) break;
  from += pageSize;
}

function esc(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

const csvLines = ["serial,title,status,type,slug,created_at,id"];
for (let i = 0; i < rows.length; i += 1) {
  const row = rows[i];
  csvLines.push(
    [
      i + 1,
      esc(row.title_kn || ""),
      row.status || "",
      row.type || "",
      esc(row.slug || ""),
      row.created_at || "",
      row.id,
    ].join(","),
  );
}

const txtLines = rows.map((row, i) => {
  const title = String(row.title_kn || row.id || "")
    .replace(/\s+/g, " ")
    .trim();
  return `${String(i + 1).padStart(4, " ")}. ${title}`;
});

const docsDir = resolve(root, "docs");
mkdirSync(docsDir, { recursive: true });
const csvPath = resolve(docsDir, "article-serial-list.csv");
const txtPath = resolve(docsDir, "article-serial-list.txt");
writeFileSync(csvPath, csvLines.join("\n"), "utf8");
writeFileSync(txtPath, txtLines.join("\n"), "utf8");

console.log(`TOTAL=${rows.length}`);
console.log(`CSV=${csvPath}`);
console.log(`TXT=${txtPath}`);
if (rows[0]) console.log(`FIRST=1. ${rows[0].title_kn || rows[0].id}`);
if (rows.length) {
  const last = rows[rows.length - 1];
  console.log(`LAST=${rows.length}. ${last.title_kn || last.id}`);
}
