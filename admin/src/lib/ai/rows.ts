import type { TranslationTarget } from "@/lib/i18n/script";
import {
  applyTranslation,
  planTranslation,
  translatable,
  translationTargets,
  type TranslationPass,
  type TranslationRow,
} from "./translatable";

/**
 * Reading, writing and calling the provider are injected rather than imported, so
 * the same engine serves the editor save path (Supabase plus the gated,
 * budget-reserving translateFields), the backfill script, and unit tests with a
 * fake provider. Nothing here imports "server-only".
 */
export type RowTranslationDeps = {
  /** Rows for the given ids, each including its id. Missing ids may be omitted. */
  read: (table: string, ids: string[]) => Promise<TranslationRow[]>;
  write: (table: string, id: string, patch: TranslationRow) => Promise<void>;
  translate: (
    target: TranslationTarget,
    fields: Record<string, string>,
  ) => Promise<Record<string, string>>;
  sanitize?: (html: string) => string;
};

/** Rows share one provider call per language, so keys carry which row they are. */
const prefix = (index: number) => index + ":";
const only = (fields: Record<string, string>, index: number) => {
  const head = prefix(index),
    mine: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields))
    if (key.startsWith(head)) mine[key.slice(head.length)] = value;
  return mine;
};

/**
 * Fills the translation columns these rows left blank, in one provider call per
 * language however many rows are passed.
 *
 * Never throws and never leaves a row worse off. A disabled or unconfigured
 * provider, an exhausted budget, a refusal, a wrong-script answer or a failed
 * write all end with the row exactly as the editor saved it, showing Kannada in
 * the other languages, which is what pickText already falls back to.
 *
 * Returns the number of rows actually updated.
 */
export async function translateRows(
  deps: RowTranslationDeps,
  table: string,
  ids: string[],
  pass: TranslationPass,
) {
  const fields = translatable[table];
  if (!ids.length || !fields?.some((field) => field.pass === pass)) return 0;
  let rows: TranslationRow[];
  try {
    rows = await deps.read(table, ids);
  } catch {
    return 0;
  }
  const index = (row: TranslationRow) => ids.indexOf(String(row.id));
  const results: {
    target: TranslationTarget;
    requested: Record<string, string>;
    translated: Record<string, string>;
  }[] = [];
  for (const target of translationTargets) {
    const requested: Record<string, string> = {};
    for (const row of rows) {
      if (index(row) < 0) continue;
      for (const [key, value] of Object.entries(
        planTranslation(fields, row, pass, target),
      ))
        requested[prefix(index(row)) + key] = value;
    }
    if (!Object.keys(requested).length) continue;
    try {
      const translated = await deps.translate(target, requested);
      if (Object.keys(translated).length)
        results.push({ target, requested, translated });
    } catch {
      // This language keeps Kannada. The other one may still be affordable, so
      // whatever we have already paid for is not thrown away with it.
    }
  }
  if (!results.length) return 0;
  // Read again before writing. The long pass can land well after the save, and a
  // jsonb payload is rewritten whole, so the merge has to be against what the
  // row holds now rather than what it held when we asked.
  let current: TranslationRow[];
  try {
    current = await deps.read(table, ids);
  } catch {
    return 0;
  }
  let written = 0;
  for (const row of current) {
    const position = index(row);
    if (position < 0) continue;
    const patch: TranslationRow = {};
    for (const { target, requested, translated } of results)
      Object.assign(
        patch,
        applyTranslation(
          fields,
          { ...row, ...patch },
          pass,
          target,
          only(requested, position),
          only(translated, position),
          deps.sanitize,
        ),
      );
    if (!Object.keys(patch).length) continue;
    try {
      await deps.write(table, String(row.id), patch);
      written++;
    } catch {
      // The row is unchanged and still readable in Kannada.
    }
  }
  return written;
}

/** Whether a table has anything this pass would translate. */
export function hasTranslatablePass(table: string, pass: TranslationPass) {
  return !!translatable[table]?.some((field) => field.pass === pass);
}

export { translationTargets };
export type { TranslationPass, TranslationRow };
