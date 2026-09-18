"use client";
import { useState } from "react";
import { draftSuggestions, acceptSuggestion } from "@/app/admin/ai/actions";
import { aiKinds, type AiKind, type AiSuggestions } from "@/lib/ai/schema";
import { v4 as t } from "@/content/strings.kn";
export function AiAssistant({
  postId,
  getText,
  getCategoryIds,
  onAccept,
}: {
  postId?: string;
  getText: () => string;
  getCategoryIds: () => string[];
  onAccept: (field: string, value: string) => void;
}) {
  const [kind, setKind] = useState<AiKind>("summary"),
    [result, setResult] = useState<{
      id: string;
      output: AiSuggestions;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [accepted, setAccepted] = useState<number[]>([]);
  return (
    <section className="utility-panel wide">
      <h2>{t.aiSuggestion}</h2>
      <p>{t.aiReview}</p>
      <label className="field">
        {t.contentType}
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as AiKind)}
        >
          {aiKinds.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button button-outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const data = await draftSuggestions({
              post_id: postId,
              kind,
              text: getText(),
              category_ids: getCategoryIds(),
            });
            if (data.error) setMessage(data.error);
            else if (data.id && data.output) {
              setResult({ id: data.id, output: data.output });
              setAccepted([]);
            }
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? t.loading : t.generate}
      </button>
      {result?.output.suggestions.map((item, i) => (
        <div className="suggestion" key={i}>
          <strong>{item.field}</strong>
          <p>{item.value}</p>
          <small>{item.reason}</small>
          <button
            type="button"
            className="chip"
            disabled={accepted.includes(i)}
            onClick={async () => {
              try {
                const status = await acceptSuggestion(result.id, i);
                if (status.error) {
                  setMessage(status.error);
                  return;
                }
                onAccept(item.field, item.value);
                setAccepted([...accepted, i]);
              } catch {
                setMessage(t.failed);
              }
            }}
          >
            {accepted.includes(i) ? t.accepted : t.accept}
          </button>
        </div>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
