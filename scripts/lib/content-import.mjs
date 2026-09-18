import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import ts from "typescript";

const root = new URL("../../", import.meta.url);
const moduleUrl = async (file, replacements = {}) => {
  let source = ts.transpileModule(await readFile(new URL(file, root), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  for (const [from, to] of Object.entries(replacements)) source = source.replaceAll(from, to);
  return "data:text/javascript;base64," + Buffer.from(source).toString("base64");
};
export const sqlValue = (value) => {
  if (value === undefined || value === null) return "null";
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  return "'" + (typeof value === "object" ? JSON.stringify(value) : String(value)).replaceAll("'", "''") + "'";
};

/** Build a single atomic import from the content actually displayed by demo mode. */
export async function buildContentImport() {
  const demoUrl = await moduleUrl("src/lib/data/demo.ts");
  const { categories, demoPosts, demoEvents } = await import(demoUrl);
  const { v4Demo } = await import(await moduleUrl("src/lib/v4/demo.ts", {"@/lib/data/demo": demoUrl}));
  const { resolvePlace } = await import(await moduleUrl("src/lib/utils/geography.ts"));
  const ids = new Map();
  const uuid = (n) => "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
  categories.forEach((row, i) => ids.set(row.id, uuid(i + 1)));
  demoPosts.forEach((row, i) => ids.set(row.id, uuid(1000 + i)));
  demoEvents.forEach((row, i) => ids.set(row.id, uuid(100 + i)));
  for (const rows of Object.values(v4Demo)) for (const row of rows) if (row.id) {
    const h = createHash("sha256").update("jwalamala-v4:" + row.id).digest("hex");
    ids.set(row.id, `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`);
  }
  const map = (value, key = "") => {
    if (Array.isArray(value)) return value.map((v) => map(v, key.endsWith("_ids") ? "id" : key));
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, map(v, k)]));
    if (typeof value === "string" && (key === "id" || key.endsWith("_id"))) {
      if (!ids.has(value)) throw new Error(`Unmapped content reference: ${key}`);
      return ids.get(value);
    }
    return value;
  };
  const rows = {};
  rows.categories = categories.map((row, i) => map({...row, sort_order: i, is_seed: false}));
  rows.events = demoEvents.map((row) => map(row));
  rows.tags = v4Demo.tags.map((row) => map(row));
  rows.places = v4Demo.places.map((row) => map({...row, state: row.state || "Karnataka"}));
  rows.authors = v4Demo.authors.map((row) => map(row));
  rows.posts = demoPosts.map(({category_slugs: _categories, ...row}) => map({
    ...row,
    image_credit: "ಮಾದರಿ ಚಿತ್ರ — docs/ASSETS.md",
    place_id: resolvePlace(v4Demo.places, row.place_id, row.event_place)?.id || null,
  }));
  const order = ["series", "jain_calendar_days", "basadis", "notices", "opportunities", "liveblogs", "liveblog_updates", "galleries", "web_stories", "polls", "quizzes", "topics", "trending_items", "post_tags", "topic_pins", "series_items", "reservoir_readings", "market_rates", "corrections_log"];
  for (const table of order) rows[table] = v4Demo[table].map((row) => map(row));
  const statements = [
    "-- Imports the existing application content, including clearly labelled sample articles.",
    "-- Apply all schema migrations first. Inserts only; never updates existing editorial content.",
    "-- A conflicting slug/identity aborts the transaction instead of overwriting a record.",
    "BEGIN;",
    "SET LOCAL request.jwt.claim.role = 'service_role';",
  ];
  for (const [table, records] of Object.entries(rows)) for (const row of records) {
    const columns = Object.keys(row);
    if (row.id && row.slug && table !== "categories") statements.push(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.${table} WHERE id=${sqlValue(row.id)} AND slug<>${sqlValue(row.slug)}) THEN RAISE EXCEPTION 'Content identity conflict in ${table}'; END IF; END $$;`,
    );
    if (row.is_seed) statements.push(
      `DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.${table} WHERE id=${sqlValue(row.id)} AND NOT is_seed) THEN RAISE EXCEPTION 'Sample identity is already used by editorial content in ${table}'; END IF; END $$;`,
    );
    const values = columns.map((key) => key.endsWith("_ids") ? `ARRAY[${row[key].map(sqlValue).join(",")}]::uuid[]` : sqlValue(row[key]));
    const conflict = table === "categories" ? "(slug)" : row.id ? "(id)" : "";
    statements.push(`INSERT INTO public.${table}(${columns.join(",")}) VALUES(${values.join(",")}) ON CONFLICT ${conflict} DO NOTHING;`);
  }
  rows.post_categories = [];
  for (const post of demoPosts) for (const [index, slug] of [...new Set(post.category_slugs)].entries()) {
    rows.post_categories.push({post_id: ids.get(post.id), category_slug: slug, is_primary: index === 0});
    statements.push(`INSERT INTO public.post_categories(post_id,category_id,is_primary) SELECT ${sqlValue(ids.get(post.id))},id,${index === 0} FROM public.categories WHERE slug=${sqlValue(slug)} ON CONFLICT DO NOTHING;`);
  }
  statements.push("COMMIT;");
  return {sql: statements.join("\n") + "\n", rows, counts: Object.fromEntries(Object.entries(rows).map(([table, data]) => [table, data.length]))};
}
