"use client";
import { useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
function fieldSets({
  kn,
  v4: t,
  tr,
}: ReturnType<typeof useUiStrings>): Record<
  string,
  { key: string; label: string; type?: string }[]
> {
  const en = tr({ en: " (English)", kn: " (English)", hi: " (अंग्रेज़ी)" }),
    hi = tr({ en: " (Hindi)", kn: " (हिंदी)", hi: " (हिंदी)" });
  return {
    timeline: [
      { key: "date", label: kn.eventDate, type: "date" },
      { key: "text", label: t.note },
      { key: "text_en", label: t.note + en },
      { key: "text_hi", label: t.note + hi },
    ],
    images: [
      { key: "url", label: kn.link },
      { key: "caption", label: t.caption },
      { key: "caption_en", label: t.caption + en },
      { key: "caption_hi", label: t.caption + hi },
      { key: "credit", label: t.credit },
    ],
    photos: [
      { key: "url", label: kn.link },
      { key: "caption", label: t.caption },
      { key: "credit", label: t.credit },
    ],
    slides: [
      { key: "image", label: kn.link },
      { key: "text", label: kn.title },
      { key: "text_en", label: kn.title + en },
      { key: "text_hi", label: kn.title + hi },
      { key: "credit", label: t.credit },
      { key: "href", label: t.read },
    ],
    questions: [
      { key: "question", label: t.question },
      { key: "question_en", label: t.question + en },
      { key: "question_hi", label: t.question + hi },
      { key: "options", label: t.options, type: "lines" },
      { key: "options_en", label: t.options + en, type: "lines" },
      { key: "options_hi", label: t.options + hi, type: "lines" },
      { key: "answer", label: t.answer, type: "number" },
      { key: "explanation", label: t.explanation },
      { key: "explanation_en", label: t.explanation + en },
      { key: "explanation_hi", label: t.explanation + hi },
    ],
  };
}
export function StructuredEditor({
  name,
  initial,
}: {
  name: string;
  initial: unknown;
}) {
  const strings = useUiStrings(),
    t = strings.v4,
    fields = fieldSets(strings)[name] || [];
  const [rows, setRows] = useState<Record<string, unknown>[]>(
    Array.isArray(initial) ? initial : [],
  );
  function update(index: number, key: string, value: unknown) {
    setRows(
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }
  return (
    <div className="structured-editor">
      <input type="hidden" name={name} value={JSON.stringify(rows)} />
      {rows.map((row, i) => (
        <div className="structured-row" key={i}>
          <strong>{i + 1}</strong>
          {fields.map((field) => (
            <label className="field" key={field.key}>
              {field.label}
              {field.type === "lines" ? (
                <textarea
                  value={
                    Array.isArray(row[field.key])
                      ? (row[field.key] as string[]).join("\n")
                      : ""
                  }
                  onChange={(event) =>
                    update(i, field.key, event.target.value.split("\n"))
                  }
                />
              ) : (
                <input
                  type={field.type || "text"}
                  value={String(row[field.key] ?? "")}
                  onChange={(event) =>
                    update(
                      i,
                      field.key,
                      field.type === "number"
                        ? Number(event.target.value)
                        : event.target.value,
                    )
                  }
                />
              )}
            </label>
          ))}
          {name === "questions" && <p className="meta">{t.answerNumberHint}</p>}
          <button
            type="button"
            className="chip"
            onClick={() => setRows(rows.filter((_, index) => index !== i))}
          >
            {t.remove}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button button-outline"
        onClick={() => setRows([...rows, {}])}
      >
        {t.addRow}
      </button>
    </div>
  );
}
