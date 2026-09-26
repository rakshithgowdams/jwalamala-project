import "./lib/supabase-env.mjs";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { getAdminClient } from "@/lib/supabase/admin";
import { providerOptions } from "@/lib/providers/budget";
import { translateFields } from "@/lib/ai/translate";
import { autoTranslatePost, rowTranslationDeps } from "@/lib/ai/autotranslate";
import { translateRows, type RowTranslationDeps } from "@/lib/ai/rows";
import {
  planTranslation,
  translatable,
  translationColumns,
  translationTargets,
  type TranslationPass,
  type TranslationRow,
} from "@/lib/ai/translatable";

/**
 * Translates rows that are already in the database. The save path only helps
 * content saved from now on; everything written before it, and everything a
 * seed file did not carry, stays Kannada-only in English and Hindi until this
 * runs.
 *
 * Safe to interrupt and safe to re-run. A row is only ever asked about when a
 * translation column is blank, so finishing work twice costs nothing and an
 * editor's own words are never overwritten.
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY and OPENAI_MODEL, demo mode
 * off, and the "ai" provider enabled with budget left in provider_settings.
 */

const usage = `Usage: npm run db:backfill -- [options]

  --table <name>   only this table; repeatable. "posts" is allowed.
  --pass <name>    only "short" (labels) or "long" (prose and jsonb payloads).
  --batch <n>      rows per provider call (default 20).
  --page <n>       rows per database read (default 200).
  --delay <ms>     wait between provider calls (default 1200).
  --limit <n>      stop after scanning this many rows per table (default all).
  --state <path>   resume file (default .tmp/translation-backfill.json).
  --dry-run        report what would be translated; calls no provider.
  --help
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) {
  console.log(usage);
  process.exit(0);
}
const flag = (name: string) => argv.includes("--" + name);
const values = (name: string) =>
  argv.flatMap((arg, index) => (arg === "--" + name ? [argv[index + 1]] : []));
const value = (name: string) => values(name).at(-1) || "";
const count = (name: string, fallback: number) => {
  const raw = Number(value(name));
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
};

const dryRun = flag("dry-run"),
  batchSize = count("batch", 20),
  pageSize = count("page", 200),
  delay = Number.isFinite(Number(value("delay"))) ? count("delay", 1200) : 1200,
  scanLimit = count("limit", 0),
  statePath = value("state") || ".tmp/translation-backfill.json";
const onlyTables = values("table").filter(Boolean);
const onlyPass = value("pass") as TranslationPass | "";
const passes: TranslationPass[] = onlyPass ? [onlyPass] : ["short", "long"];

function refuse(reason: string): never {
  console.error(reason);
  process.exit(1);
}

if (onlyPass && !["short", "long"].includes(onlyPass))
  refuse('--pass must be "short" or "long".');
for (const table of onlyTables)
  if (table !== "posts" && !translatable[table])
    refuse(
      "Unknown table " +
        table +
        ". Known: posts, " +
        Object.keys(translatable).join(", "),
    );

// Never print a value, only whether it is there.
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  ...(dryRun ? [] : ["OPENAI_API_KEY", "OPENAI_MODEL"]),
].filter((name) => !process.env[name]);
if (required.length)
  refuse(
    "Missing " +
      required.join(", ") +
      " in .env. The service key is needed to read and write every table, and " +
      "the OpenAI settings to translate (not needed with --dry-run).",
  );
if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
  refuse(
    "NEXT_PUBLIC_DEMO_MODE is true, so there is no live database to back fill. " +
      "Set it to false in .env first.",
  );
const db = getAdminClient();
if (!db) refuse("Could not build a service-role Supabase client.");
if (!dryRun && !(await providerOptions("ai")))
  refuse(
    'The "ai" provider is disabled in provider_settings. Enable it, and give it ' +
      "budget, before back filling.",
  );

/**
 * Messages that mean asking again is pointless: the provider is off, missing, or
 * out of money. Anything else is treated as transient until it repeats.
 */
const terminal = [
  "AI is not configured",
  "AI is disabled",
  "Provider disabled or budget exhausted",
  "Service unavailable",
];
let stopReason = "",
  failures = 0;
const translate: RowTranslationDeps["translate"] = async (target, fields) => {
  try {
    const result = await translateFields(target, fields);
    failures = 0;
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "provider failed";
    if (terminal.includes(message)) stopReason = message;
    else if (++failures >= 3)
      stopReason = "three provider failures in a row: " + message;
    // Rethrown so the engine's own containment still applies to this row.
    throw error;
  }
};
const deps: RowTranslationDeps = { ...rowTranslationDeps, translate };

// Ctrl-C finishes the batch in flight and saves the cursor rather than tearing a
// jsonb rewrite in half.
let interrupted = false;
process.on("SIGINT", () => {
  if (interrupted) process.exit(130);
  interrupted = true;
  console.log("\nInterrupted; finishing the current batch.");
});
const stopping = () => interrupted || !!stopReason;

type State = { cursors: Record<string, string> };
let state: State = { cursors: {} };
try {
  state = JSON.parse(await readFile(statePath, "utf8"));
  state.cursors ||= {};
} catch {
  // No resume file yet, or an unreadable one: start from the first row.
}
const saveState = async () => {
  await mkdir(dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2) + "\n");
};

const totals: Record<string, { scanned: number; found: number; done: number }> =
  {};
const record = (
  label: string,
  scanned: number,
  found: number,
  done: number,
) => {
  const row = (totals[label] ||= { scanned: 0, found: 0, done: 0 });
  row.scanned += scanned;
  row.found += found;
  row.done += done;
};

/** Ordered by id so an interrupted run can pick up where it stopped. */
async function page(table: string, columns: string, cursor: string) {
  let query = db!
    .from(table)
    .select(columns)
    .order("id", { ascending: true })
    .limit(pageSize);
  if (cursor) query = query.gt("id", cursor);
  const { data, error } = await query;
  if (error) throw Error(error.message);
  return (data || []) as unknown as TranslationRow[];
}

async function backfill(table: string, pass: TranslationPass) {
  const fields = translatable[table];
  if (!fields.some((field) => field.pass === pass)) return;
  const label = table + " (" + pass + ")";
  const columns = ["id", ...translationColumns(fields)].join(",");
  const key = label;
  let cursor = state.cursors[key] || "";
  let scanned = 0;
  while (!stopping()) {
    let rows: TranslationRow[];
    try {
      rows = await page(table, columns, cursor);
    } catch (error) {
      console.error(
        label + ": read failed (" + (error as Error).message + "); skipped.",
      );
      return;
    }
    if (!rows.length) break;
    scanned += rows.length;
    // The engine decides what "needs translating" means, so discovery cannot
    // drift away from what the writer will actually accept.
    const needed = rows.filter((row) =>
      translationTargets.some(
        (target) =>
          Object.keys(planTranslation(fields, row, pass, target)).length,
      ),
    );
    let done = 0;
    for (let at = 0; at < needed.length && !stopping(); at += batchSize) {
      const ids = needed.slice(at, at + batchSize).map((row) => String(row.id));
      if (dryRun) continue;
      done += await translateRows(deps, table, ids, pass);
      if (stopping()) break;
      if (delay) await sleep(delay);
    }
    record(label, rows.length, needed.length, done);
    // Only advance past rows we have finished with. Re-reading a page is cheap
    // and idempotent; skipping one would leave it Kannada-only forever.
    if (!stopping()) {
      cursor = String(rows[rows.length - 1].id);
      state.cursors[key] = cursor;
      await saveState();
    }
    if (rows.length < pageSize) break;
    if (scanLimit && scanned >= scanLimit) break;
  }
}

/**
 * public.posts keeps its own path: autoTranslatePost also records the
 * machine-translation disclosure and keeps the transliterated headline in step.
 * It swallows its own failures, so progress is judged by whether the row moved.
 */
const postFields: [string, string][] = [
  ["title_kn", "title"],
  ["summary_kn", "summary"],
  ["body_html", "body"],
];
const postColumns = [
  "id",
  ...postFields.flatMap(([source, column]) => [
    source,
    ...translationTargets.map((target) => column + "_" + target),
  ]),
].join(",");
const postNeeds = (row: TranslationRow) =>
  translationTargets.some((target) =>
    postFields.some(
      ([source, column]) =>
        String(row[source] ?? "").trim() &&
        !String(row[column + "_" + target] ?? "").trim(),
    ),
  );

async function backfillPosts() {
  const key = "posts";
  let cursor = state.cursors[key] || "";
  let scanned = 0,
    idle = 0;
  while (!stopping()) {
    let rows: TranslationRow[];
    try {
      rows = await page("posts", postColumns, cursor);
    } catch (error) {
      console.error("posts: read failed (" + (error as Error).message + ").");
      return;
    }
    if (!rows.length) break;
    scanned += rows.length;
    const needed = rows.filter(postNeeds);
    let done = 0;
    for (const row of needed) {
      if (stopping()) break;
      if (dryRun) continue;
      const id = String(row.id);
      await autoTranslatePost(id, "short");
      if (delay) await sleep(delay);
      await autoTranslatePost(id, "body");
      const { data: current } = await db!
        .from("posts")
        .select(postColumns)
        .eq("id", id)
        .maybeSingle();
      if (!postNeeds((current as unknown as TranslationRow) || row)) {
        done++;
        idle = 0;
      } else if (++idle >= 3) {
        stopReason =
          "three posts in a row gained no translation; the provider is likely " +
          "off or out of budget";
        break;
      }
      if (delay) await sleep(delay);
    }
    record("posts", rows.length, needed.length, done);
    if (!stopping()) {
      cursor = String(rows[rows.length - 1].id);
      state.cursors[key] = cursor;
      await saveState();
    }
    if (rows.length < pageSize) break;
    if (scanLimit && scanned >= scanLimit) break;
  }
}

const wanted = onlyTables.length
  ? onlyTables
  : ["posts", ...Object.keys(translatable)];
for (const table of wanted) {
  if (stopping()) break;
  if (table === "posts") {
    if (!onlyPass || onlyPass === "short") await backfillPosts();
    continue;
  }
  for (const pass of passes) {
    if (stopping()) break;
    await backfill(table, pass);
  }
}
await saveState();

const entries = Object.entries(totals).filter(([, row]) => row.found);
console.log(
  dryRun
    ? "Dry run: nothing was written and no provider was called."
    : "Back fill finished.",
);
for (const [label, row] of entries)
  console.log(
    "  " +
      label.padEnd(34) +
      " scanned " +
      row.scanned +
      ", needing " +
      row.found +
      ", updated " +
      row.done,
  );
if (!entries.length) console.log("  Nothing left to translate.");
if (stopReason) {
  console.error("Stopped early: " + stopReason + ".");
  console.error(
    "Re-run once it is resolved; the cursor in " + statePath + " resumes.",
  );
  process.exit(1);
}
if (interrupted) process.exit(130);
