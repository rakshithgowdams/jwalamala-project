"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  saveLiveUpdate,
  endLiveBlog,
  deleteLiveUpdate,
} from "@/app/admin/v4/actions";
import type { LiveUpdate } from "@/lib/v4/types";
import { kn, v4 as t } from "@/content/strings.kn";
export function LiveConsole({
  blogId,
  updates,
  isLive,
}: {
  blogId: string;
  updates: LiveUpdate[];
  isLive: boolean;
}) {
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
          Media type
          <select
            name="media_type"
            defaultValue={selected?.media?.type || "image"}
          >
            <option value="image">Image</option>
            <option value="video">Video</option>
          </select>
        </label>
        <label className="field">
          Media URL
          <input name="media_url" defaultValue={selected?.media?.url || ""} />
        </label>
        <label className="field">
          Media credit
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
            Delete update
          </button>
          <button className="chip" onClick={() => setSelected(update)}>
            {t.edit}
          </button>
        </article>
      ))}
    </>
  );
}
