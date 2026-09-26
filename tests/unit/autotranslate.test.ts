import { describe, it, expect } from "vitest";
import type { TranslationTarget } from "@/lib/i18n/script";
import { translateRows, type RowTranslationDeps } from "@/lib/ai/rows";
import {
  planTranslation,
  translatable,
  translationColumns,
  type TranslationRow,
} from "@/lib/ai/translatable";

/**
 * The provider is injected, so these exercise the real planning, guarding and
 * merging without a network call or an API key. The fake stands in for
 * translateFields, which means anything the engine lets through here would reach
 * the database in production.
 */
type Reply = (
  target: TranslationTarget,
  fields: Record<string, string>,
) => Record<string, string>;

function harness(
  rows: TranslationRow[],
  reply: Reply,
  options: {
    onRead?: (round: number, store: TranslationRow[]) => void;
    writeFails?: boolean;
  } = {},
) {
  const store = rows.map((row) => structuredClone(row));
  const calls: {
    target: TranslationTarget;
    fields: Record<string, string>;
  }[] = [];
  let reads = 0;
  const deps: RowTranslationDeps = {
    read: async (_table, ids) => {
      options.onRead?.(++reads, store);
      return store
        .filter((row) => ids.includes(String(row.id)))
        .map((row) => structuredClone(row));
    },
    write: async (_table, id, patch) => {
      if (options.writeFails) throw Error("write failed");
      const row = store.find((candidate) => String(candidate.id) === id);
      if (row) Object.assign(row, patch);
    },
    translate: async (target, fields) => {
      calls.push({ target, fields });
      return reply(target, fields);
    },
    // Stands in for cleanHtml, so a sanitiser running at all is observable.
    sanitize: (html) => html.replace(/<[^>]*>/g, ""),
  };
  return { deps, store, calls };
}

const tag = (extra: TranslationRow = {}) => ({
  id: "tag-1",
  name_kn: "ಸುದ್ದಿ",
  name_en: "",
  name_hi: "",
  ...extra,
});
const english = "News",
  hindi = "समाचार";

/**
 * Answers exactly the keys that were asked about, which is how a cooperative
 * model behaves. Replying under a key nobody asked for is ignored on purpose, so
 * tests have to use the real ones or they prove nothing.
 */
const answer = (
  fields: Record<string, string>,
  text: (key: string) => string,
) => Object.fromEntries(Object.keys(fields).map((key) => [key, text(key)]));

describe("translatable field map", () => {
  it("selects the Kannada source and both translation columns", () => {
    expect(translationColumns(translatable.tags)).toEqual([
      "name_kn",
      "name_en",
      "name_hi",
    ]);
    // A jsonb payload carries its translations inside the source column.
    expect(translationColumns(translatable.web_stories)).toEqual([
      "title_kn",
      "title_en",
      "title_hi",
      "slides",
    ]);
  });
  it("keeps every mapped table out of the posts path", () => {
    expect(translatable.posts).toBeUndefined();
  });
});

describe("row auto-translation", () => {
  it("fills the translation columns the editor left blank", async () => {
    const { deps, store, calls } = harness([tag()], (target, fields) =>
      answer(fields, () => (target === "en" ? english : hindi)),
    );
    expect(await translateRows(deps, "tags", ["tag-1"], "short")).toBe(1);
    expect(store[0].name_en).toBe(english);
    expect(store[0].name_hi).toBe(hindi);
    expect(calls.map((call) => call.target)).toEqual(["en", "hi"]);
  });

  it("never asks about a field that already holds text", async () => {
    const { deps, store, calls } = harness(
      [tag({ name_en: "Newsroom" })],
      (_target, fields) => answer(fields, () => hindi),
    );
    await translateRows(deps, "tags", ["tag-1"], "short");
    // The English column is the editor's, so it is neither sent nor rewritten.
    expect(store[0].name_en).toBe("Newsroom");
    expect(calls).toHaveLength(1);
    expect(calls[0].target).toBe("hi");
    expect(store[0].name_hi).toBe(hindi);
  });

  it("spends nothing when every translation is already there", async () => {
    const { deps, calls } = harness(
      [tag({ name_en: english, name_hi: hindi })],
      (_target, fields) => answer(fields, () => "should not be asked"),
    );
    expect(await translateRows(deps, "tags", ["tag-1"], "short")).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("discards a translation that is not written in its own script", async () => {
    // A model that gives up echoes the Kannada source instead of refusing, which
    // would publish Kannada as the English name.
    const { deps, store } = harness([tag()], (target, fields) =>
      answer(fields, () => (target === "en" ? "ಸುದ್ದಿ" : hindi)),
    );
    await translateRows(deps, "tags", ["tag-1"], "short");
    expect(store[0].name_en).toBe("");
    expect(store[0].name_hi).toBe(hindi);
  });

  it("discards a translation longer than the column will accept", async () => {
    const { deps, store } = harness([tag()], (target, fields) =>
      answer(fields, () =>
        target === "en" ? "N".repeat(151) : "N".repeat(150),
      ),
    );
    await translateRows(deps, "tags", ["tag-1"], "short");
    // tags.name_en is capped at 150 by the admin schema, so 151 must not be
    // written; the Hindi guard rejects Latin text, so nothing lands there either.
    expect(store[0].name_en).toBe("");
    expect(store[0].name_hi).toBe("");
  });

  it("leaves the row exactly as saved when the provider throws", async () => {
    const { deps, store } = harness([tag()], () => {
      throw Error("AI provider unavailable");
    });
    expect(await translateRows(deps, "tags", ["tag-1"], "short")).toBe(0);
    expect(store[0]).toEqual(tag());
  });

  it("keeps the language it paid for when the next one runs out of budget", async () => {
    const { deps, store } = harness([tag()], (target, fields) => {
      if (target === "hi") throw Error("Provider disabled or budget exhausted");
      return answer(fields, () => english);
    });
    expect(await translateRows(deps, "tags", ["tag-1"], "short")).toBe(1);
    expect(store[0].name_en).toBe(english);
    expect(store[0].name_hi).toBe("");
  });

  it("leaves the row untouched when the write itself fails", async () => {
    const { deps, store } = harness(
      [tag()],
      (_target, fields) => answer(fields, () => english),
      { writeFails: true },
    );
    expect(await translateRows(deps, "tags", ["tag-1"], "short")).toBe(0);
    expect(store[0]).toEqual(tag());
  });

  it("does nothing for a table with no translatable fields", async () => {
    const { deps, calls } = harness(
      [{ id: "c-1", slug: "spring" }],
      (_target, fields) => answer(fields, () => english),
    );
    expect(await translateRows(deps, "ad_campaigns", ["c-1"], "short")).toBe(0);
    expect(calls).toHaveLength(0);
  });

  it("keeps long prose out of the pass the editor waits for", async () => {
    const row = {
      id: "s-1",
      title_kn: "ಸರಣಿ",
      title_en: "",
      title_hi: "",
      description_kn: "ಸರಣಿಯ ವಿವರಣೆ",
      description_en: "",
      description_hi: "",
    };
    const { deps, store, calls } = harness([row], (target) => ({
      "0:title": target === "en" ? "Series" : "श्रृंखला",
    }));
    await translateRows(deps, "series", ["s-1"], "short");
    for (const call of calls)
      expect(Object.keys(call.fields)).toEqual(["0:title"]);
    expect(store[0].title_en).toBe("Series");
    // The description belongs to the long pass, so the editor did not wait for it.
    expect(store[0].description_en).toBe("");
  });

  it("sends several rows in one call per language", async () => {
    const rows = ["a", "b", "c"].map((suffix) =>
      tag({ id: "tag-" + suffix, name_kn: "ಸುದ್ದಿ " + suffix }),
    );
    const { deps, store, calls } = harness(rows, (target, fields) =>
      answer(fields, (key) => (target === "en" ? english : hindi) + " " + key),
    );
    const written = await translateRows(
      deps,
      "tags",
      rows.map((row) => String(row.id)),
      "short",
    );
    expect(written).toBe(3);
    expect(calls).toHaveLength(2);
    expect(Object.keys(calls[0].fields)).toEqual([
      "0:name",
      "1:name",
      "2:name",
    ]);
    expect(store.map((row) => row.name_en)).toEqual([
      "News 0:name",
      "News 1:name",
      "News 2:name",
    ]);
  });

  it("lets an edit that lands during the deferred pass win", async () => {
    const row = {
      id: "g-1",
      title_kn: "ಚಿತ್ರಗಳು",
      title_en: "",
      title_hi: "",
      description_kn: "ಕಾರ್ಯಕ್ರಮದ ಚಿತ್ರಗಳು",
      description_en: "",
      description_hi: "",
      images: [],
    };
    const { deps, store } = harness(
      [row],
      (_target, fields) =>
        answer(fields, () => "Photographs from the programme"),
      {
        onRead: (round, store) => {
          // The editor saves their own English text while the long pass is in
          // flight; the second read is the one the merge is built on.
          if (round === 2) store[0].description_en = "Editor's own words";
        },
      },
    );
    await translateRows(deps, "galleries", ["g-1"], "long");
    expect(store[0].description_en).toBe("Editor's own words");
  });
});

describe("translated arrays", () => {
  const poll = (extra: TranslationRow = {}) => ({
    id: "p-1",
    question_kn: "ನಿಮ್ಮ ಆಯ್ಕೆ ಯಾವುದು?",
    question_en: "",
    question_hi: "",
    options: ["ಮೊದಲನೆಯದು", "ಎರಡನೆಯದು", "ಮೂರನೆಯದು"],
    options_en: [],
    options_hi: [],
    ...extra,
  });

  it("writes a translated list only when every element came back", async () => {
    const { deps, store } = harness([poll()], (target, fields) =>
      answer(
        fields,
        (key) =>
          (target === "en" ? "Option" : "विकल्प") + " " + key.split(".").pop(),
      ),
    );
    await translateRows(deps, "polls", ["p-1"], "short");
    expect(store[0].options_en).toEqual(["Option 0", "Option 1", "Option 2"]);
  });

  it("rejects a partial list whole, because a short list labels the wrong votes", async () => {
    const { deps, store } = harness([poll()], (target, fields) => {
      const reply: Record<string, string> = {};
      // The model answers about the question and only two of the three options.
      for (const key of Object.keys(fields)) {
        if (key === "0:options.2") continue;
        reply[key] = target === "en" ? "Option " + key : "विकल्प " + key;
      }
      return reply;
    });
    await translateRows(deps, "polls", ["p-1"], "short");
    expect(store[0].options_en).toEqual([]);
    expect(store[0].options_hi).toEqual([]);
  });

  it("rejects the whole list when one element breaks the ceiling", async () => {
    const { deps, store } = harness([poll()], (_target, fields) =>
      answer(fields, (key) =>
        key === "0:options.1" ? "X".repeat(201) : "Option",
      ),
    );
    await translateRows(deps, "polls", ["p-1"], "short");
    expect(store[0].options_en).toEqual([]);
  });

  it("leaves a list the editor already filled to the right length", async () => {
    const existing = ["First", "Second", "Third"];
    const { deps, store, calls } = harness(
      [poll({ options_en: existing, question_en: "Which do you prefer?" })],
      () => ({}),
    );
    await translateRows(deps, "polls", ["p-1"], "short");
    expect(store[0].options_en).toEqual(existing);
    expect(calls.find((call) => call.target === "en")).toBeUndefined();
  });

  it("replaces a stale list whose length no longer matches the Kannada one", async () => {
    // A two-item English list against three Kannada options is ignored by every
    // renderer, so there is no human text to protect.
    const wanted = planTranslation(
      translatable.polls,
      poll({ options_en: ["First", "Second"] }),
      "short",
      "en",
    );
    expect(Object.keys(wanted)).toEqual([
      "question",
      "options.0",
      "options.1",
      "options.2",
    ]);
  });
});

describe("translations inside jsonb payloads", () => {
  it("fills gallery captions without losing the other keys", async () => {
    const row = {
      id: "g-1",
      title_kn: "ಚಿತ್ರಗಳು",
      title_en: "",
      title_hi: "",
      description_kn: "",
      description_en: "",
      description_hi: "",
      images: [
        {
          url: "/images/one.jpg",
          credit: "Staff",
          caption: "ಮೊದಲ ಚಿತ್ರ",
          caption_en: "Already written",
        },
        { url: "/images/two.jpg", credit: "Staff", caption: "ಎರಡನೆಯ ಚಿತ್ರ" },
      ],
    };
    const { deps, store, calls } = harness([row], (target, fields) =>
      answer(fields, () =>
        target === "en" ? "Second photograph" : "दूसरा चित्र",
      ),
    );
    await translateRows(deps, "galleries", ["g-1"], "long");
    const images = store[0].images as Record<string, string>[];
    // The filled caption was never asked about, and url and credit survive the
    // rewrite of the whole column.
    expect(calls.find((call) => call.target === "en")?.fields).toEqual({
      "0:images.1.caption": "ಎರಡನೆಯ ಚಿತ್ರ",
    });
    expect(images[0].caption_en).toBe("Already written");
    expect(images[1]).toEqual({
      url: "/images/two.jpg",
      credit: "Staff",
      caption: "ಎರಡನೆಯ ಚಿತ್ರ",
      caption_en: "Second photograph",
      caption_hi: "दूसरा चित्र",
    });
  });

  it("does not rewrite a payload column when nothing usable came back", async () => {
    const images = [
      { url: "/images/one.jpg", credit: "Staff", caption: "ಮೊದಲ ಚಿತ್ರ" },
    ];
    const { deps, store } = harness(
      [
        {
          id: "g-2",
          title_kn: "ಚಿತ್ರಗಳು",
          title_en: "x",
          title_hi: "x",
          description_kn: "",
          description_en: "",
          description_hi: "",
          images,
        },
      ],
      () => ({ "0:images.0.caption": "C".repeat(301) }),
    );
    expect(await translateRows(deps, "galleries", ["g-2"], "long")).toBe(0);
    expect(store[0].images).toEqual(images);
  });

  it("keeps quiz options aligned with the answer index or drops them", async () => {
    const question = {
      question: "ಯಾವ ವರ್ಷ?",
      options: ["೧೯೪೭", "೧೯೫೦", "೧೯೬೨"],
      answer: 1,
      explanation: "ಸಂವಿಧಾನ ಜಾರಿಗೆ ಬಂದ ವರ್ಷ",
    };
    const { deps, store } = harness(
      [
        {
          id: "q-1",
          title_kn: "ಪ್ರಶ್ನೆಮಾಲೆ",
          title_en: "Quiz",
          title_hi: "प्रश्नमाला",
          questions: [question],
        },
      ],
      (target, fields) => {
        const reply: Record<string, string> = {};
        for (const key of Object.keys(fields)) {
          // Hindi loses one option, so its option list must be dropped entirely
          // while its question and explanation still land.
          if (target === "hi" && key.endsWith("options.2")) continue;
          const tail = key.split(".").pop();
          reply[key] =
            target === "en" ? "English " + tail : "हिंदी अनुवाद " + tail;
        }
        return reply;
      },
    );
    await translateRows(deps, "quizzes", ["q-1"], "long");
    const stored = (store[0].questions as Record<string, unknown>[])[0];
    expect(stored.answer).toBe(1);
    expect(stored.options_en).toEqual(["English 0", "English 1", "English 2"]);
    expect(stored.options_hi).toBeUndefined();
    expect(stored.question_hi).toBe("हिंदी अनुवाद question");
    expect(stored.explanation_hi).toBe("हिंदी अनुवाद explanation");
  });
});

describe("markup columns", () => {
  it("sanitises a translated live update before storing it", async () => {
    const { deps, store } = harness(
      [
        {
          id: "u-1",
          body_html: "<p>ಸಭೆ ಆರಂಭವಾಯಿತು</p>",
          body_html_en: "",
          body_html_hi: "",
        },
      ],
      (target, fields) =>
        answer(fields, () =>
          target === "en"
            ? '<p onclick="steal()">The session has begun</p>'
            : "<p>सत्र शुरू हुआ</p>",
        ),
    );
    await translateRows(deps, "liveblog_updates", ["u-1"], "long");
    expect(store[0].body_html_en).toBe("The session has begun");
    expect(store[0].body_html_hi).toBe("सत्र शुरू हुआ");
  });
});
