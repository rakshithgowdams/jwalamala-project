"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Check, Search, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { PostThumb } from "@/components/admin/PostThumb";
import {
  searchArticlesForAssign,
  type ArticleSearchHit,
} from "@/app/admin/tasks/actions";

type Props = {
  value: string;
  selectedTitle?: string;
  onChange: (hit: ArticleSearchHit | null) => void;
};

/**
 * Searchable article picker with result cards — finds any title in the library,
 * not only the recent dropdown list.
 */
export function ArticleCardSearch({ value, selectedTitle = "", onChange }: Props) {
  const { tr } = useUiStrings();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<ArticleSearchHit[]>([]);
  const [pending, start] = useTransition();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!open) return;
    const handle = window.setTimeout(() => {
      start(async () => {
        const rows = await searchArticlesForAssign(query);
        setHits(rows);
        setActive(0);
      });
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  function choose(hit: ArticleSearchHit | null) {
    onChange(hit);
    setQuery("");
    setOpen(false);
  }

  function openList() {
    setOpen(true);
    if (!hits.length) {
      start(async () => {
        const rows = await searchArticlesForAssign("");
        setHits(rows);
      });
    }
  }

  const display = open ? query : selectedTitle;

  return (
    <div className="field article-card-search">
      <label htmlFor={id}>
        {tr({ en: "Search articles", kn: "ಲೇಖನಗಳನ್ನು ಹುಡುಕಿ", hi: "लेख खोजें" })}
      </label>
      <div className="article-card-search-control">
        <Search size={16} aria-hidden="true" className="article-card-search-icon" />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={`${id}-grid`}
          aria-autocomplete="list"
          placeholder={tr({
            en: "Type a title to search the full library…",
            kn: "ಪೂರ್ಣ ಲೈಬ್ರರಿಯಲ್ಲಿ ಹುಡುಕಲು ಶೀರ್ಷಿಕೆ ಟೈಪ್ ಮಾಡಿ…",
            hi: "पूरी लाइब्रेरी में खोजने के लिए शीर्षक लिखें…",
          })}
          value={display}
          onFocus={openList}
          onClick={() => !open && openList()}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return openList();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((current) => (current + step + hits.length) % Math.max(hits.length, 1));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (hits[active]) choose(hits[active]);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        {value && !open ? (
          <button
            type="button"
            className="article-card-search-clear"
            aria-label={tr({ en: "Clear article", kn: "ಲೇಖನ ತೆರವುಗೊಳಿಸಿ", hi: "लेख हटाएँ" })}
            onClick={() => {
              choose(null);
              inputRef.current?.focus();
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {open ? (
        <div className="article-card-search-panel" id={`${id}-grid`} role="listbox">
          {pending && !hits.length ? (
            <p className="article-card-search-empty">
              {tr({ en: "Searching…", kn: "ಹುಡುಕಲಾಗುತ್ತಿದೆ…", hi: "खोज रहे हैं…" })}
            </p>
          ) : null}
          {!pending && !hits.length ? (
            <p className="article-card-search-empty">
              {tr({
                en: "No articles match that title.",
                kn: "ಆ ಶೀರ್ಷಿಕೆಗೆ ಲೇಖನಗಳು ಸಿಗಲಿಲ್ಲ.",
                hi: "उस शीर्षक से कोई लेख नहीं मिला।",
              })}
            </p>
          ) : null}
          <ul className="article-card-search-grid">
            {hits.map((hit, i) => {
              const selected = hit.id === value;
              return (
                <li key={hit.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={
                      "article-card-search-card" +
                      (i === active ? " is-active" : "") +
                      (selected ? " is-selected" : "")
                    }
                    onMouseEnter={() => setActive(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      choose(hit);
                    }}
                  >
                    <span className="article-card-search-thumb">
                      <PostThumb src={hit.thumbnail || "/images/jwalamala-logo.jpg"} />
                    </span>
                    <span className="article-card-search-meta">
                      <strong>{hit.title || hit.id}</strong>
                      <small>
                        {hit.status}
                        {hit.type ? ` · ${hit.type}` : ""}
                      </small>
                    </span>
                    {selected ? <Check size={16} aria-hidden="true" /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
      {value && selectedTitle && !open ? (
        <p className="article-card-search-picked">
          {tr({ en: "Selected:", kn: "ಆಯ್ಕೆ:", hi: "चयनित:" })} {selectedTitle}
        </p>
      ) : null}
    </div>
  );
}
