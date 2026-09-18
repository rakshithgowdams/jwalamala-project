import { readdir, readFile } from "node:fs/promises";

/** Dashboard exports duplicate original migrations under a second timestamp.
 * Keep their history, but never execute identical schema changes twice.
 * A diverging export is an error requiring reconciliation, never silently skipped.
 */
export async function migrationFiles(directory) {
  const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();
  const canonical = [];
  for (const name of files) {
    const original = /^\d{14}_(\d{14}_.+\.sql)\.sql$/.exec(name)?.[1];
    if (!original) { canonical.push(name); continue; }
    if (!files.includes(original)) throw new Error(`Missing original migration for ${name}`);
    const normalize = (sql) => sql.replace(/\r\n/g, "\n").trim().replace(/;\s*$/, "");
    const [exported, source] = await Promise.all([
      readFile(new URL(name, directory), "utf8"), readFile(new URL(original, directory), "utf8"),
    ]);
    if (normalize(exported) !== normalize(source)) throw new Error(`Migration export differs: ${name}`);
  }
  return canonical;
}
