import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { cleanHtml } from "@/lib/utils/sanitize";
import { translateFields, type TranslationTarget } from "./translate";
import { translateRows, type RowTranslationDeps } from "./rows";
import {
  translatable,
  translationColumns,
  type TranslationPass,
  type TranslationRow,
} from "./translatable";

const targets: TranslationTarget[] = ["en", "hi"];

/**
 * The headline and summary are short enough to translate while the editor waits,
 * so cards and listings are never half-Kannada. The body is translated after the
 * response so publishing does not block on it.
 */
export type TranslationPhase = "short" | "body";

/** Mirrors the length guards inside save_editor_post, which rejects the write. */
const limits: Record<string, number> = {
  title: 300,
  summary: 1000,
  body: 200000,
};

const sourceFor: Record<TranslationPhase, Record<string, string>> = {
  short: { title: "title_kn", summary: "summary_kn" },
  body: { body: "body_html" },
};

type Flags = Record<string, boolean>;

/**
 * Fills in the translation columns the editor left blank and records which ones
 * a machine wrote, so the article can disclose it. Never throws: a failed or
 * disabled translation must leave the post published with Kannada showing
 * through, which is what pickText already falls back to.
 */
export async function autoTranslatePost(
  postId: string,
  phase: TranslationPhase,
) {
  try {
    const db = getAdminClient();
    if (!db) return;
    const { data: post } = await db
      .from("posts")
      .select(
        "title_kn,summary_kn,body_html,title_translit,machine_translated,title_en,summary_en,body_en,title_hi,summary_hi,body_hi",
      )
      .eq("id", postId)
      .maybeSingle();
    if (!post) return;
    const row = post as Record<string, string | Flags | null>;
    const update: Record<string, string> = {};
    const flags: Flags = { ...((row.machine_translated as Flags) || {}) };
    for (const target of targets) {
      const wanted: Record<string, string> = {};
      for (const [field, sourceColumn] of Object.entries(sourceFor[phase])) {
        const column = field + "_" + target;
        // Anything already there stays: an editor's own words outrank the
        // machine, and re-translating text we already paid for would spend
        // budget again on every save.
        if (String(row[column] || "").trim()) continue;
        const source = String(row[sourceColumn] || "").trim();
        if (source) wanted[field] = source;
      }
      if (!Object.keys(wanted).length) continue;
      const translated = await translateFields(target, wanted);
      for (const [field, value] of Object.entries(translated)) {
        const column = field + "_" + target;
        const text = field === "body" ? cleanHtml(value) : value;
        if (!text.trim() || text.length > limits[field]) continue;
        update[column] = text;
        flags[column] = true;
      }
    }
    if (!Object.keys(update).length) return;
    // The slug-adjacent transliteration is derived from the English headline, so
    // a generated headline has to keep it in step.
    if (update.title_en && !String(row.title_translit || "").trim())
      update.title_translit = update.title_en.toLowerCase();
    await db
      .from("posts")
      .update({ ...update, machine_translated: flags })
      .eq("id", postId);
  } catch {
    // Budget exhausted, provider down, or AI switched off: leave Kannada in place.
  }
}

/**
 * Supabase and the gated provider, for every table outside public.posts. The
 * engine in ./rows takes these as arguments so a script and a test can supply
 * their own without reaching for the service key or the network.
 */
export const rowTranslationDeps: RowTranslationDeps = {
  read: async (table, ids) => {
    const db = getAdminClient();
    if (!db) return [];
    const { data } = await db
      .from(table)
      .select(
        ["id", ...translationColumns(translatable[table] || [])].join(","),
      )
      .in("id", ids);
    return (data as unknown as TranslationRow[] | null) || [];
  },
  write: async (table, id, patch) => {
    const db = getAdminClient();
    if (!db) throw Error("Service unavailable");
    const { error } = await db.from(table).update(patch).eq("id", id);
    if (error) throw Error("Translation write failed");
  },
  translate: translateFields,
  sanitize: cleanHtml,
};

/**
 * Fills the blank translation columns of saved rows. Never throws, so a save is
 * never undone by a translation that could not be made.
 */
export function autoTranslateRows(
  table: string,
  ids: string[],
  pass: TranslationPass,
) {
  return translateRows(rowTranslationDeps, table, ids, pass);
}

/**
 * Drops the machine-translation marks for fields the editor actually changed, so
 * the disclosure disappears once a human takes responsibility for the text. The
 * editor form arrives pre-filled with whatever is stored, so an untouched field
 * comes back byte-identical and keeps its mark.
 */
export async function clearReviewedTranslations(
  postId: string,
  previous: Record<string, unknown>,
  submitted: Record<string, unknown>,
) {
  const stored = (previous.machine_translated as Flags) || {};
  const flags: Flags = {};
  for (const [column, marked] of Object.entries(stored))
    if (
      marked &&
      String(submitted[column] ?? "").trim() ===
        String(previous[column] ?? "").trim()
    )
      flags[column] = true;
  if (Object.keys(flags).length === Object.keys(stored).length) return;
  const db = getAdminClient();
  if (!db) return;
  await db.from("posts").update({ machine_translated: flags }).eq("id", postId);
}
