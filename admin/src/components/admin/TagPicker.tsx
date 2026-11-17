"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

type TagOption = { id: string; name_kn: string };

/** Matches the server limit on tag_ids in the post schema. */
const MAX_TAGS = 20;

export function TagPicker({
  label,
  tags,
  value,
  onChange,
}: {
  label: string;
  tags: TagOption[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { tr } = useUiStrings();
  const [query, setQuery] = useState("");
  const byId = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  const selected = value.filter((id) => byId.has(id));
  const picked = new Set(selected);
  const full = selected.length >= MAX_TAGS;
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? tags.filter((tag) => tag.name_kn.toLowerCase().includes(needle))
    : tags;

  function toggle(id: string) {
    if (picked.has(id)) onChange(selected.filter((item) => item !== id));
    else if (!full) onChange([...selected, id]);
  }

  return (
    <div className="field tag-picker">
      <span className="tag-picker-label">
        {label}
        <small>
          {selected.length} / {MAX_TAGS}
        </small>
      </span>
      {selected.map((id) => (
        <input key={id} type="hidden" name="tag_ids" value={id} />
      ))}

      {selected.length ? (
        <div className="tag-picker-selected" aria-live="polite">
          {selected.map((id) => (
            <button
              type="button"
              key={id}
              className="tag-chip is-picked"
              onClick={() => toggle(id)}
              aria-label={tr({
                en: `Remove ${byId.get(id)?.name_kn}`,
                kn: `${byId.get(id)?.name_kn} ತೆಗೆದುಹಾಕಿ`,
                hi: `${byId.get(id)?.name_kn} हटाएँ`,
              })}
            >
              {byId.get(id)?.name_kn}
              <X size={13} aria-hidden="true" />
            </button>
          ))}
          <button type="button" className="tag-picker-clear" onClick={() => onChange([])}>
            {tr({ en: "Clear all", kn: "ಎಲ್ಲ ತೆರವುಗೊಳಿಸಿ", hi: "सब हटाएँ" })}
          </button>
        </div>
      ) : (
        <small className="field-hint">
          {tr({
            en: "No tags yet. Click tags below to add them.",
            kn: "ಇನ್ನೂ ಟ್ಯಾಗ್ ಇಲ್ಲ. ಕೆಳಗಿನ ಟ್ಯಾಗ್‌ಗಳನ್ನು ಕ್ಲಿಕ್ ಮಾಡಿ ಸೇರಿಸಿ.",
            hi: "अभी कोई टैग नहीं। नीचे टैग पर क्लिक करके जोड़ें।",
          })}
        </small>
      )}

      <input
        type="search"
        className="tag-picker-search"
        value={query}
        onChange={(event) => {
          // Searching is not an edit; keep it from marking the article unsaved.
          event.stopPropagation();
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          const first = visible.find((tag) => !picked.has(tag.id));
          if (first && !full) {
            toggle(first.id);
            setQuery("");
          }
        }}
        placeholder={tr({
          en: `Search ${tags.length} tags…`,
          kn: `${tags.length} ಟ್ಯಾಗ್‌ಗಳಲ್ಲಿ ಹುಡುಕಿ…`,
          hi: `${tags.length} टैग में खोजें…`,
        })}
        aria-label={tr({ en: "Search tags", kn: "ಟ್ಯಾಗ್ ಹುಡುಕಿ", hi: "टैग खोजें" })}
      />

      <div className="tag-picker-pool" role="group" aria-label={label}>
        {visible.map((tag) => {
          const on = picked.has(tag.id);
          return (
            <button
              type="button"
              key={tag.id}
              className={"tag-chip" + (on ? " is-picked" : "")}
              aria-pressed={on}
              disabled={!on && full}
              onClick={() => toggle(tag.id)}
            >
              {tag.name_kn}
            </button>
          );
        })}
        {!visible.length ? (
          <small className="field-hint">
            {tr({ en: "No tag matches.", kn: "ಹೊಂದುವ ಟ್ಯಾಗ್ ಇಲ್ಲ.", hi: "कोई टैग नहीं मिला।" })}
          </small>
        ) : null}
      </div>
      {full ? (
        <small className="field-hint">
          {tr({
            en: `Up to ${MAX_TAGS} tags per article.`,
            kn: `ಒಂದು ಲೇಖನಕ್ಕೆ ಗರಿಷ್ಠ ${MAX_TAGS} ಟ್ಯಾಗ್‌ಗಳು.`,
            hi: `एक लेख में अधिकतम ${MAX_TAGS} टैग।`,
          })}
        </small>
      ) : null}
    </div>
  );
}
