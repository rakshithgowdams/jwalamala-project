import { writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { v4Demo } from "../src/lib/v4/demo";
import { categories, demoPosts, demoEvents } from "../src/lib/data/demo";
// The seed inserts use "on conflict do nothing", so re-running them will not add
// translations to rows a database already holds. This emits the matching
// UPDATEs, keyed by the same derived ids the seed generators use.
const ids = new Map<string, string>();
const seedUuid = (n: number) =>
  "00000000-0000-4000-8000-" + String(n).padStart(12, "0");
demoPosts.forEach((p, i) => ids.set(p.id, seedUuid(1000 + i)));
demoEvents.forEach((e, i) => ids.set(e.id, seedUuid(100 + i)));
function id(value: string) {
  if (ids.has(value)) return ids.get(value)!;
  const hash = createHash("sha256")
    .update("jwalamala-v4:" + value)
    .digest("hex");
  const uuid =
    hash.slice(0, 8) +
    "-" +
    hash.slice(8, 12) +
    "-4" +
    hash.slice(13, 16) +
    "-8" +
    hash.slice(17, 20) +
    "-" +
    hash.slice(20, 32);
  ids.set(value, uuid);
  return uuid;
}
const quote = (value: unknown) =>
  "'" + String(value).replaceAll("'", "''") + "'";
const literal = (value: unknown) =>
  Array.isArray(value) || (value && typeof value === "object")
    ? quote(JSON.stringify(value)) + "::jsonb"
    : quote(value);
const tables = [
  "tags",
  "places",
  "authors",
  "series",
  "jain_calendar_days",
  "basadis",
  "notices",
  "opportunities",
  "liveblogs",
  "liveblog_updates",
  "galleries",
  "web_stories",
  "polls",
  "quizzes",
  "topics",
  "trending_items",
  "reservoir_readings",
] as const;

// Translations that live inside a jsonb payload cannot be patched per language:
// the column has to be rewritten whole, which means carrying all three languages
// in one statement. They get their own file for that reason.
const nestedColumns: [keyof typeof v4Demo, string][] = [
  ["galleries", "images"],
  ["web_stories", "slides"],
  ["quizzes", "questions"],
  ["topics", "timeline"],
];

const languages = [
  {
    suffix: "_en",
    name: "English",
    file: "english-content.sql",
    migration: "supabase/migrations/20260918190000_v6_english.sql",
  },
  {
    suffix: "_hi",
    name: "Hindi",
    file: "hindi-content.sql",
    migration: "supabase/migrations/20260918120000_v5_hindi.sql",
  },
];

for (const language of languages) {
  const statements: string[] = [];
  let rows = 0;
  const update = (table: string, rowId: string, source: object) => {
    const columns = Object.entries(source).filter(
      ([column, value]) =>
        column.endsWith(language.suffix) &&
        value !== undefined &&
        value !== null &&
        value !== "",
    );
    if (!columns.length) return;
    rows++;
    statements.push(
      "update public." +
        table +
        " set " +
        columns
          .map(([column, value]) => column + "=" + literal(value))
          .join(",") +
        " where id='" +
        rowId +
        "';",
    );
  };
  for (const [index, category] of categories.entries())
    update("categories", seedUuid(index + 1), category);
  for (const [index, event] of demoEvents.entries())
    update("events", seedUuid(100 + index), event);
  for (const [index, post] of demoPosts.entries())
    update("posts", seedUuid(1000 + index), post);
  for (const table of tables)
    for (const source of v4Demo[table])
      update(table, id((source as { id: string }).id), source);
  const sql = [
    "-- " + language.name + " translations for the seeded sample rows.",
    "-- Apply " + language.migration + " first.",
    "-- Only *" +
      language.suffix +
      " columns are written, so this is safe to re-run.",
    "begin;",
    ...statements,
    "commit;",
  ];
  await writeFile(
    new URL("../supabase/" + language.file, import.meta.url),
    sql.join("\n") + "\n",
  );
  console.log(
    "Wrote " +
      rows +
      " " +
      language.name +
      " updates across " +
      new Set(statements.map((line) => line.split(" ")[1])).size +
      " tables -> supabase/" +
      language.file,
  );
}

const nested: string[] = [];
for (const [table, column] of nestedColumns)
  for (const source of v4Demo[table]) {
    const row = source as Record<string, unknown>;
    const payload = row[column];
    if (!Array.isArray(payload) || !payload.length) continue;
    // Only worth emitting when a translated key is actually present inside.
    if (
      !payload.some((item) =>
        Object.keys(item as object).some(
          (key) => key.endsWith("_en") || key.endsWith("_hi"),
        ),
      )
    )
      continue;
    nested.push(
      "update public." +
        table +
        " set " +
        column +
        "=" +
        literal(payload) +
        " where id='" +
        id(String(row.id)) +
        "';",
    );
  }
await writeFile(
  new URL("../supabase/nested-content.sql", import.meta.url),
  [
    "-- Translations that live inside jsonb payloads: gallery captions, story slide",
    "-- text, quiz questions and topic timelines.",
    "-- Apply supabase/migrations/20260918210000_v7_attribution.sql first.",
    "-- Each statement replaces the whole column, so unlike the per-language files",
    "-- this one carries Kannada, English and Hindi together. Safe to re-run, but it",
    "-- overwrites any edit made to these payloads in the database.",
    "begin;",
    ...nested,
    "commit;",
  ].join("\n") + "\n",
);
console.log(
  "Wrote " +
    nested.length +
    " nested jsonb updates across " +
    new Set(nested.map((line) => line.split(" ")[1])).size +
    " tables -> supabase/nested-content.sql",
);
