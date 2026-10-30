"use client";
import { useState, useTransition } from "react";
import { queuePush } from "@/app/admin/push/actions";
import { pushTopics } from "@/lib/push/schema";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function PushComposer({
  posts,
}: {
  posts: { id: string; title_kn: string; summary_kn: string }[];
}) {
  const { tr, pushLabels } = useUiStrings();
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
          setMessage(
            r.error ||
              tr({
                en: "Added to the send queue.",
                kn: "ಕಳುಹಿಸುವ ಪಟ್ಟಿಗೆ ಸೇರಿಸಲಾಗಿದೆ.",
                hi: "भेजने की कतार में जोड़ा गया।",
              }),
          );
        });
      }}
    >
      <label className="field wide">
        {tr({
          en: "Published article",
          kn: "ಪ್ರಕಟಿತ ಲೇಖನ",
          hi: "प्रकाशित लेख",
        })}
        <select
          required
          name="post_id"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">
            {tr({ en: "Select", kn: "ಆಯ್ಕೆಮಾಡಿ", hi: "चुनें" })}
          </option>
          {posts.map((p) => (
            <option value={p.id} key={p.id}>
              {p.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr({ en: "Topic", kn: "ವಿಷಯ", hi: "विषय" })}
        <select name="topic">
          {pushTopics.map((t) => (
            <option key={t} value={t}>
              {pushLabels[t]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr({ en: "Title", kn: "ಶೀರ್ಷಿಕೆ", hi: "शीर्षक" })}
        <input
          key={selected}
          name="title"
          required
          maxLength={110}
          defaultValue={p?.title_kn || ""}
        />
      </label>
      <label className="field wide">
        {tr({ en: "Message", kn: "ಸಂದೇಶ", hi: "संदेश" })}
        <textarea
          key={selected}
          name="body"
          required
          maxLength={200}
          defaultValue={p?.summary_kn.slice(0, 200) || ""}
        />
      </label>
      <button className="button button-ember" disabled={busy || !p}>
        {tr({
          en: "Approve and send",
          kn: "ಅನುಮೋದಿಸಿ ಕಳುಹಿಸಿ",
          hi: "स्वीकृत करें और भेजें",
        })}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
