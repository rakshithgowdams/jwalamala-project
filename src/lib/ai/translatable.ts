import { isUsableTranslation, type TranslationTarget } from "@/lib/i18n/script";

/**
 * Which columns hold Kannada that needs an English and Hindi counterpart, and
 * how to write those counterparts back. Declarative on purpose: the save hooks,
 * the backfill script and the tests all read the same map, so a table cannot be
 * translated on one path and forgotten on another.
 *
 * This module is deliberately free of "server-only" imports and of any database
 * or provider access, so a script and a unit test can use it directly.
 */

/** Kannada is the source of record, so it is never a target. */
export const translationTargets: TranslationTarget[] = ["en", "hi"];

/**
 * How much text a field holds, which decides whether the editor waits for it.
 * Short fields are the labels that appear in cards, menus and listings; long
 * fields are prose and jsonb payloads that would visibly stall a save.
 */
export type TranslationPass = "short" | "long";

type Common = {
  /** Column holding the Kannada text, e.g. "name_kn" or "organiser". */
  source: string;
  /** Longest translation the schemas and RPCs will accept for this field. */
  limit: number;
  pass: TranslationPass;
};

/** A plain text column: "name" writes name_en and name_hi. */
type TextField = Common & {
  kind: "text";
  column: string;
  /** Sanitise the translation, for columns that store markup. */
  html?: boolean;
};

/**
 * A jsonb array of strings with parallel translated arrays, e.g. polls.options
 * and polls.options_en. Renderers only use a translated array when its length
 * matches the Kannada one, so these translate all-or-nothing.
 */
type ListField = Common & { kind: "list"; column: string };

/** A translatable key inside each object of a jsonb array. */
export type PayloadEntry =
  | { kind: "text"; key: string; limit: number }
  | { kind: "list"; key: string; limit: number };

/**
 * A jsonb array of objects carrying their translations inside, e.g.
 * galleries.images[].caption_en. The whole column is rewritten, so the merge
 * always builds on the values currently stored.
 */
type PayloadField = Omit<Common, "limit"> & {
  kind: "payload";
  entries: PayloadEntry[];
};

export type TranslatableField = TextField | ListField | PayloadField;

const short = (source: string, column: string, limit: number): TextField => ({
  kind: "text",
  source,
  column,
  limit,
  pass: "short",
});
const long = (source: string, column: string, limit: number): TextField => ({
  kind: "text",
  source,
  column,
  limit,
  pass: "long",
});
const markup = (source: string, column: string, limit: number): TextField => ({
  ...long(source, column, limit),
  html: true,
});
const list = (
  source: string,
  column: string,
  limit: number,
  pass: TranslationPass,
): ListField => ({ kind: "list", source, column, limit, pass });
const payload = (source: string, entries: PayloadEntry[]): PayloadField => ({
  kind: "payload",
  source,
  entries,
  pass: "long",
});
const entry = (key: string, limit: number): PayloadEntry => ({
  kind: "text",
  key,
  limit,
});
const entryList = (key: string, limit: number): PayloadEntry => ({
  kind: "list",
  key,
  limit,
});

/**
 * Ceilings match src/lib/v4/admin-schema.ts and src/lib/admin/resources.ts, so a
 * translation can never be long enough for the editor's own save to reject it.
 * public.posts is absent on purpose: it keeps its own path in ./autotranslate,
 * which also maintains the machine-translation disclosure and the transliterated
 * headline.
 */
export const translatable: Record<string, TranslatableField[]> = {
  categories: [short("name_kn", "name", 200)],
  events: [
    short("name_kn", "name", 300),
    short("organiser", "organiser", 300),
    long("description_kn", "description", 20000),
  ],
  ads: [short("alt_kn", "alt", 300)],
  tags: [short("name_kn", "name", 150)],
  places: [short("name_kn", "name", 150)],
  authors: [
    short("name_kn", "name", 300),
    short("role_kn", "role", 300),
    long("bio_kn", "bio", 20000),
    long("credentials_kn", "credentials", 20000),
  ],
  topics: [
    short("title_kn", "title", 300),
    long("intro_kn", "intro", 20000),
    list("key_facts", "key_facts", 500, "long"),
    payload("timeline", [entry("text", 300)]),
  ],
  trending_items: [short("label_kn", "label", 300)],
  series: [
    short("title_kn", "title", 300),
    long("description_kn", "description", 20000),
  ],
  jain_calendar_days: [
    short("title_kn", "title", 300),
    long("description_kn", "description", 20000),
  ],
  basadis: [
    short("name_kn", "name", 300),
    short("deity_kn", "deity", 300),
    short("timings_kn", "timings", 1000),
    long("history_kn", "history", 20000),
  ],
  notices: [short("title_kn", "title", 300), long("body_kn", "body", 20000)],
  opportunities: [
    short("title_kn", "title", 300),
    short("org", "org", 300),
    long("description_kn", "description", 20000),
  ],
  liveblogs: [
    short("title_kn", "title", 300),
    long("summary_kn", "summary", 20000),
  ],
  liveblog_updates: [markup("body_html", "body_html", 20000)],
  galleries: [
    short("title_kn", "title", 300),
    long("description_kn", "description", 20000),
    payload("images", [entry("caption", 300)]),
  ],
  web_stories: [
    short("title_kn", "title", 300),
    payload("slides", [entry("text", 300)]),
  ],
  // A poll question without its options is unreadable, and the options are short,
  // so both are translated while the editor waits.
  polls: [
    short("question_kn", "question", 300),
    list("options", "options", 200, "short"),
  ],
  quizzes: [
    short("title_kn", "title", 300),
    payload("questions", [
      entry("question", 300),
      entryList("options", 300),
      entry("explanation", 300),
    ]),
  ],
  reservoir_readings: [
    short("name_kn", "name", 300),
    short("source", "source", 300),
  ],
  market_rates: [short("unit", "unit", 300), short("source", "source", 300)],
  // Neither of these has an editor save path in the app, so only the backfill
  // reaches them. Chapter labels additionally survive only until the next post
  // save, which recreates every key_points row from a text blob that carries no
  // translation; fixing that properly means changing the post editor and
  // save_editor_post_chapters.
  corrections_log: [long("note_kn", "note", 20000)],
  key_points: [short("label_kn", "label", 300)],
};

/** Columns a read must fetch before this table can be translated. */
export function translationColumns(fields: TranslatableField[]) {
  const columns = new Set<string>();
  for (const field of fields) {
    columns.add(field.source);
    // Payload translations live inside the source column; the others are siblings.
    if (field.kind !== "payload")
      for (const target of translationTargets)
        columns.add(field.column + "_" + target);
  }
  return [...columns];
}

export type TranslationRow = Record<string, unknown>;

const blank = (value: unknown) => !String(value ?? "").trim();
const stringList = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? (value as string[])
    : null;

/**
 * A translated array is only rendered when its length matches the Kannada one,
 * so an array of the right length is the editor's work and is left alone, while
 * anything else is unused by every renderer and may be replaced whole.
 */
const listIsEditors = (existing: unknown, source: string[]) =>
  stringList(existing)?.length === source.length;

/**
 * The Kannada text this row still needs translating for one target, keyed so the
 * result can be put back exactly where it came from. An empty result means there
 * is nothing to pay for.
 */
export function planTranslation(
  fields: TranslatableField[],
  row: TranslationRow,
  pass: TranslationPass,
  target: TranslationTarget,
) {
  const wanted: Record<string, string> = {};
  for (const field of fields) {
    if (field.pass !== pass) continue;
    if (field.kind === "text") {
      // Anything already written stays: an editor's own words outrank the machine,
      // and re-translating text we have paid for would spend budget every save.
      if (!blank(row[field.column + "_" + target])) continue;
      const source = String(row[field.source] ?? "").trim();
      if (source) wanted[field.column] = source;
      continue;
    }
    if (field.kind === "list") {
      const source = stringList(row[field.source]);
      if (
        !source?.length ||
        listIsEditors(row[field.column + "_" + target], source)
      )
        continue;
      source.forEach((value, index) => {
        if (value.trim()) wanted[field.column + "." + index] = value.trim();
      });
      continue;
    }
    const items = row[field.source];
    if (!Array.isArray(items)) continue;
    items.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const element = item as TranslationRow;
      for (const key of field.entries) {
        const at = field.source + "." + index + "." + key.key;
        if (key.kind === "text") {
          if (!blank(element[key.key + "_" + target])) continue;
          const source = String(element[key.key] ?? "").trim();
          if (source) wanted[at] = source;
          continue;
        }
        const source = stringList(element[key.key]);
        if (
          !source?.length ||
          listIsEditors(element[key.key + "_" + target], source)
        )
          continue;
        source.forEach((value, position) => {
          if (value.trim()) wanted[at + "." + position] = value.trim();
        });
      }
    });
  }
  return wanted;
}

/**
 * Turns a provider result into a patch for the row as it stands now. Everything
 * is re-checked against the current row rather than the one we planned from, so
 * an edit that landed while the translation was in flight wins.
 *
 * The script guard and the length ceiling are applied here as well as inside
 * translateFields. This is the only place that writes, and a whole jsonb payload
 * is rewritten at once, so the check belongs at the boundary too.
 */
export function applyTranslation(
  fields: TranslatableField[],
  row: TranslationRow,
  pass: TranslationPass,
  target: TranslationTarget,
  requested: Record<string, string>,
  translated: Record<string, string>,
  sanitize: (html: string) => string = (html) => html,
) {
  const patch: TranslationRow = {};
  const wanted = planTranslation(fields, row, pass, target);
  const accept = (key: string, limit: number) => {
    // Still wanted, and still wanted for the same Kannada text we sent.
    if (wanted[key] === undefined || wanted[key] !== requested[key]) return "";
    const value = translated[key];
    if (typeof value !== "string") return "";
    const text = value.trim();
    if (!text || text.length > limit) return "";
    return isUsableTranslation(target, text) ? text : "";
  };
  /** All elements or none, because a short array is ignored by every renderer. */
  const wholeList = (
    source: string[],
    at: (index: number) => string,
    limit: number,
  ) => {
    const values: string[] = [];
    for (const [index, original] of source.entries()) {
      if (!original.trim()) {
        values.push("");
        continue;
      }
      const text = accept(at(index), limit);
      if (!text) return null;
      values.push(text);
    }
    return values.some(Boolean) ? values : null;
  };
  for (const field of fields) {
    if (field.pass !== pass) continue;
    if (field.kind === "text") {
      let text = accept(field.column, field.limit);
      if (text && field.html) {
        // Sanitising can lengthen text by escaping, so re-check afterwards.
        text = sanitize(text).trim();
        if (text.length > field.limit || !isUsableTranslation(target, text))
          text = "";
      }
      if (text) patch[field.column + "_" + target] = text;
      continue;
    }
    if (field.kind === "list") {
      const source = stringList(row[field.source]);
      if (!source?.length) continue;
      const values = wholeList(
        source,
        (index) => field.column + "." + index,
        field.limit,
      );
      if (values) patch[field.column + "_" + target] = values;
      continue;
    }
    const items = row[field.source];
    if (!Array.isArray(items)) continue;
    let filled = false;
    const next = items.map((item, index) => {
      if (!item || typeof item !== "object") return item;
      const element = { ...(item as TranslationRow) };
      for (const key of field.entries) {
        const at = field.source + "." + index + "." + key.key;
        if (key.kind === "text") {
          const text = accept(at, key.limit);
          if (!text) continue;
          element[key.key + "_" + target] = text;
          filled = true;
          continue;
        }
        const source = stringList(element[key.key]);
        if (!source?.length) continue;
        const values = wholeList(
          source,
          (position) => at + "." + position,
          key.limit,
        );
        if (!values) continue;
        element[key.key + "_" + target] = values;
        filled = true;
      }
      return element;
    });
    // Rewriting the column is only worth the clobber risk if something changed.
    if (filled) patch[field.source] = next;
  }
  return patch;
}
