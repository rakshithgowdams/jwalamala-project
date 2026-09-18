"use client";
import { useState, useTransition } from "react";
import { queuePush } from "@/app/admin/push/actions";
import { pushTopics, pushLabels } from "@/lib/push/schema";
export function PushComposer({
  posts,
}: {
  posts: { id: string; title_kn: string; summary_kn: string }[];
}) {
  const [selected, setSelected] = useState(""),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
  const p = posts.find((p) => p.id === selected);
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await queuePush(Object.fromEntries(f));
          setMessage(r.error || "ಕಳುಹಿಸುವ ಪಟ್ಟಿಗೆ ಸೇರಿಸಲಾಗಿದೆ.");
        });
      }}
    >
      <label className="field wide">
        ಪ್ರಕಟಿತ ಲೇಖನ
        <select
          required
          name="post_id"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">ಆಯ್ಕೆಮಾಡಿ</option>
          {posts.map((p) => (
            <option value={p.id} key={p.id}>
              {p.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        ವಿಷಯ
        <select name="topic">
          {pushTopics.map((t) => (
            <option key={t} value={t}>
              {pushLabels[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        ಶೀರ್ಷಿಕೆ
        <input
          key={selected}
          name="title"
          required
          maxLength={110}
          defaultValue={p?.title_kn || ""}
        />
      </label>
      <label className="field wide">
        ಸಂದೇಶ
        <textarea
          key={selected}
          name="body"
          required
          maxLength={200}
          defaultValue={p?.summary_kn.slice(0, 200) || ""}
        />
      </label>
      <button className="button button-ember" disabled={busy || !p}>
        ಅನುಮೋದಿಸಿ ಕಳುಹಿಸಿ
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
