"use client";
import { ImageUpload } from "./ImageUpload";
import { useState } from "react";
import { kn, v4 as t } from "@/content/strings.kn";
const fieldSets: Record<
  string,
  { key: string; label: string; type?: string }[]
> = {
  timeline: [
    { key: "date", label: kn.eventDate, type: "date" },
    { key: "text", label: t.note },
  ],
  images: [
    { key: "url", label: kn.link },
    { key: "caption", label: t.caption },
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
    { key: "credit", label: t.credit },
    { key: "href", label: t.read },
  ],
  questions: [
    { key: "question", label: t.question },
    { key: "options", label: t.options, type: "lines" },
    { key: "answer", label: t.answer, type: "number" },
    { key: "explanation", label: t.explanation },
  ],
};
export function StructuredEditor({
  name,
  initial,
}: {
  name: string;
  initial: unknown;
}) {
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
          {(fieldSets[name] || []).map((field) => (
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
          {["images", "photos", "slides"].includes(name) && (
            <ImageUpload
              onUploaded={(url) =>
                update(i, name === "slides" ? "image" : "url", url)
              }
            />
          )}
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
