"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveLiveUpdate,
  endLiveBlog,
  deleteLiveUpdate,
} from "@/app/admin/v4/actions";
import type { LiveUpdate } from "@/lib/v4/types";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function LiveConsole({
  blogId,
  updates,
  isLive,
}: {
  blogId: string;
  updates: LiveUpdate[];
  isLive: boolean;
}) {
  const { kn, v4: t, tr } = useUiStrings();
  const [selected, setSelected] = useState<LiveUpdate | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <form
        key={selected?.id || "new"}
        className="v4-form"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          const data = new FormData(event.currentTarget);
          try {
            const result = await saveLiveUpdate({
              id: selected?.id,
              liveblog_id: blogId,
              media: data.get("media_url")
                ? {
                    type: String(data.get("media_type")),
                    url: String(data.get("media_url")),
                    credit: String(data.get("media_credit")),
                  }
                : null,
              body_html: String(data.get("body") || ""),
              body_html_en: String(data.get("body_en") || ""),
              body_html_hi: String(data.get("body_hi") || ""),
              is_key: data.has("is_key"),
              is_pinned: data.has("is_pinned"),
            });
            setMessage(result.error || t.saved);
            if (!result.error) {
              setSelected(null);
              router.refresh();
            }
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {kn.body}
          <textarea
            name="body"
            rows={6}
            required
            defaultValue={selected?.body_html}
          />
        </label>
        <label className="field">
          {kn.body +
            tr({ en: " (English)", kn: " (English)", hi: " (अंग्रेज़ी)" })}
          <textarea
            name="body_en"
            rows={6}
            defaultValue={selected?.body_html_en || ""}
          />
        </label>
        <label className="field">
          {kn.body + tr({ en: " (Hindi)", kn: " (हिंदी)", hi: " (हिंदी)" })}
          <textarea
            name="body_hi"
            rows={6}
            defaultValue={selected?.body_html_hi || ""}
          />
        </label>
        <label className="field">
          {tr({
            en: "Media type",
            kn: "ಮಾಧ್ಯಮದ ಪ್ರಕಾರ",
            hi: "मीडिया का प्रकार",
          })}
          <select
            name="media_type"
            defaultValue={selected?.media?.type || "image"}
          >
            <option value="image">
              {tr({ en: "Image", kn: "ಚಿತ್ರ", hi: "चित्र" })}
            </option>
            <option value="video">
              {tr({ en: "Video", kn: "ವಿಡಿಯೋ", hi: "वीडियो" })}
            </option>
          </select>
        </label>
        <label className="field">
          {tr({ en: "Media link or embed code", kn: "ಮಾಧ್ಯಮ ಲಿಂಕ್ ಅಥವಾ ಎಂಬೆಡ್ ಕೋಡ್", hi: "मीडिया लिंक या एम्बेड कोड" })}
          <input
            name="media_url"
            defaultValue={selected?.media?.url || ""}
            placeholder="https://ik.imagekit.io/…  /  YouTube link  /  <iframe …>"
          />
          <small>
            {tr({
              en: "Image: an ImageKit link. Video: a YouTube or Facebook link, or its <iframe> embed code.",
              kn: "ಚಿತ್ರ: ImageKit ಲಿಂಕ್. ವಿಡಿಯೋ: YouTube ಅಥವಾ Facebook ಲಿಂಕ್, ಅಥವಾ ಅದರ <iframe> ಎಂಬೆಡ್ ಕೋಡ್.",
              hi: "चित्र: ImageKit लिंक। वीडियो: YouTube या Facebook लिंक, या उसका <iframe> एम्बेड कोड।",
            })}
          </small>
        </label>
        <label className="field">
          {tr({ en: "Media credit", kn: "ಮಾಧ್ಯಮ ಕೃಪೆ", hi: "मीडिया श्रेय" })}
          <input
            name="media_credit"
            defaultValue={selected?.media?.credit || ""}
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="is_key"
            defaultChecked={selected?.is_key}
          />{" "}
          {t.keyFacts}
        </label>
        <label>
          <input
            type="checkbox"
            name="is_pinned"
            defaultChecked={selected?.is_pinned}
          />{" "}
          {t.pinned}
        </label>
        <button className="button button-ember" disabled={busy || !isLive}>
          {t.publish}
        </button>
        <p role="status">{message}</p>
      </form>
      <button
        className="chip"
        disabled={!isLive || busy}
        onClick={async () => {
          const result = await endLiveBlog(blogId);
          setMessage(result.error || t.ended);
          router.refresh();
        }}
      >
        {t.ended}
      </button>
      {updates.map((update) => (
        <article className="utility-panel" key={update.id}>
          <time>{update.published_at}</time>
          <p>{update.body_html.replace(/<[^>]+>/g, " ")}</p>
          <button
            className="chip"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await deleteLiveUpdate(update.id);
                setMessage(r.error || t.saved);
                router.refresh();
              } catch {
                setMessage(t.failed);
              } finally {
                setBusy(false);
              }
            }}
          >
            {tr({
              en: "Delete update",
              kn: "ಅಪ್‌ಡೇಟ್ ಅಳಿಸಿ",
              hi: "अपडेट हटाएँ",
            })}
          </button>
          <button className="chip" onClick={() => setSelected(update)}>
            {t.edit}
          </button>
        </article>
      ))}
    </>
  );
}
