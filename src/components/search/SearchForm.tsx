"use client";
import { LocationFields } from "./LocationFields";
import type { Place } from "@/lib/v4/types";
import Link from "next/link";
import { Search } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
import type { Category } from "@/lib/types";
import type { Filters } from "@/lib/utils/search";
export function SearchForm({
  filters,
  places,
  categories,
  action = "/search",
}: {
  filters: Filters;
  places: Place[];
  categories: Category[];
  action?: string;
}) {
  const { kn, locale } = useUiStrings();
  return (
    <form className="filters" action={action}>
      <div className="tabs">
        <Link
          href={
            action +
            "?" +
            new URLSearchParams({ ...filters, mode: "keyword", page: "1" })
          }
          className={filters.mode !== "event_date" ? "active" : ""}
        >
          {kn.keyword}
        </Link>
        <Link
          href={
            action +
            "?" +
            new URLSearchParams({ ...filters, mode: "event_date", page: "1" })
          }
          className={filters.mode === "event_date" ? "active" : ""}
        >
          {kn.dateSearch}
        </Link>
      </div>
      <input type="hidden" name="mode" value={filters.mode || "keyword"} />
      {filters.mode !== "event_date" && (
        <>
          <label className="field" htmlFor="q">
            {kn.search}
          </label>
          <div className="search-field">
            <input
              id="q"
              name="q"
              defaultValue={filters.q}
              placeholder={kn.searchPlaceholder}
            />
            <button className="button button-ember">
              <Search size={18} />
              {kn.search}
            </button>
          </div>
          <p className="meta" style={{ marginTop: 8 }}>
            {kn.searchHint}
          </p>
        </>
      )}
      <LocationFields
        key={[filters.state, filters.district, filters.city].join("/")}
        places={places}
        filters={filters}
      />
      <div className="filter-row">
        <label className="field">
          {kn.from}
          <input type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className="field">
          {kn.to}
          <input type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className="field">
          {kn.category}
          <select name="category" defaultValue={filters.category || ""}>
            <option value="">{kn.allCategories}</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {pickText(locale, c.name_kn, c.name_en)}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-ember">{kn.filter}</button>
        <Link href={action} className="button button-outline">
          {kn.clear}
        </Link>
      </div>
    </form>
  );
}
