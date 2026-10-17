"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

const statuses = ["draft", "scheduled", "published", "archived"] as const;
const types = ["article", "video", "short"] as const;
const sorts = ["updated", "oldest", "published", "title"] as const;

export function PostFilters({
  q = "",
  status = "",
  type = "",
  sort = "updated",
}: {
  q?: string;
  status?: string;
  type?: string;
  sort?: string;
}) {
  const { tr, kn } = useUiStrings();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const current = useRef({ q, status, type, sort, search });
  current.current = { q, status, type, sort, search };

  useEffect(() => {
    setSearch(q);
  }, [q]);

  function go(next: { q?: string; status?: string; type?: string; sort?: string }) {
    const value = {
      q: current.current.search,
      status: current.current.status,
      type: current.current.type,
      sort: current.current.sort || "updated",
      ...next,
    };
    const params = new URLSearchParams();
    if (value.q.trim()) params.set("q", value.q.trim().slice(0, 200));
    if (statuses.includes(value.status as (typeof statuses)[number])) params.set("status", value.status);
    if (types.includes(value.type as (typeof types)[number])) params.set("type", value.type);
    if (value.sort && value.sort !== "updated") params.set("sort", value.sort);
    const href = params.size ? `${pathname}?${params}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  useEffect(() => {
    if (search === q) return;
    const timer = setTimeout(() => go({ q: search }), 250);
    return () => clearTimeout(timer);
    // go closes over the latest status/type/sort; search is the only debounced field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const statusLabel = {
    draft: tr({ en: "Draft", kn: "ಕರಡು", hi: "ड्राफ़्ट" }),
    scheduled: tr({ en: "Scheduled", kn: "ನಿಗದಿತ", hi: "निर्धारित" }),
    published: tr({ en: "Published", kn: "ಪ್ರಕಟಿತ", hi: "प्रकाशित" }),
    archived: tr({ en: "Archived", kn: "ಸಂಗ್ರಹಿತ", hi: "संग्रहीत" }),
  };
  const typeLabel = {
    article: tr({ en: "Article", kn: "ಲೇಖನ", hi: "लेख" }),
    video: tr({ en: "Video", kn: "ವಿಡಿಯೋ", hi: "वीडियो" }),
    short: tr({ en: "Short video", kn: "ಕಿರು ವಿಡಿಯೋ", hi: "छोटा वीडियो" }),
  };
  const sortLabel = {
    updated: tr({ en: "Newest update", kn: "ಹೊಸ ಬದಲಾವಣೆ", hi: "नया बदलाव" }),
    oldest: tr({ en: "Oldest update", kn: "ಹಳೆಯ ಬದಲಾವಣೆ", hi: "पुराना बदलाव" }),
    published: tr({ en: "Newest published", kn: "ಹೊಸ ಪ್ರಕಟಣೆ", hi: "नया प्रकाशन" }),
    title: tr({ en: "Title", kn: "ಶೀರ್ಷಿಕೆ", hi: "शीर्षक" }),
  };
  const all = tr({ en: "All", kn: "ಎಲ್ಲಾ", hi: "सभी" });
  const active = Boolean(q || status || type || (sort && sort !== "updated"));

  return (
    <form
      className={"filter-bar" + (pending ? " is-loading" : "")}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go({ q: search });
      }}
    >
      <label className="field">
        {tr({ en: "Search", kn: "ಹುಡುಕಿ", hi: "खोजें" })}
        <input
          name="q"
          type="search"
          value={search}
          placeholder={tr({ en: "Search by title", kn: "ಶೀರ್ಷಿಕೆಯಿಂದ ಹುಡುಕಿ", hi: "शीर्षक से खोजें" })}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <label className="field">
        {kn.status}
        <select name="status" value={status} onChange={(event) => go({ status: event.target.value })}>
          <option value="">{all}</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {statusLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr({ en: "Type", kn: "ಪ್ರಕಾರ", hi: "प्रकार" })}
        <select name="type" value={type} onChange={(event) => go({ type: event.target.value })}>
          <option value="">{all}</option>
          {types.map((value) => (
            <option key={value} value={value}>
              {typeLabel[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr({ en: "Sort", kn: "ಅನುಕ್ರಮ", hi: "क्रम" })}
        <select name="sort" value={sorts.includes(sort as (typeof sorts)[number]) ? sort : "updated"} onChange={(event) => go({ sort: event.target.value })}>
          {sorts.map((value) => (
            <option key={value} value={value}>
              {sortLabel[value]}
            </option>
          ))}
        </select>
      </label>
      {active ? (
        <button type="button" className="button button-outline" onClick={() => { setSearch(""); go({ q: "", status: "", type: "", sort: "updated" }); }}>
          {tr({ en: "Clear", kn: "ಅಳಿಸಿ", hi: "साफ़ करें" })}
        </button>
      ) : null}
    </form>
  );
}
