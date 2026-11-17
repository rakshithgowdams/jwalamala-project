"use client";
import { useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, MapPin, Search } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";

export type DistrictTile = {
  slug: string;
  name: string;
  altName: string;
  /** Every spelling a reader might type, in any of the site's languages. */
  search: string;
  count: number;
  headline: string;
  cover: string | null;
};

type TileStyle = CSSProperties & { [key: `--${string}`]: string };
const PALETTE = [
  "var(--vivid-1)",
  "var(--vivid-2)",
  "var(--vivid-3)",
  "var(--vivid-4)",
  "var(--vivid-5)",
  "var(--vivid-6)",
];

export function DistrictDirectory({
  districts,
}: {
  districts: DistrictTile[];
}) {
  const { kn, v4: t } = useUiStrings();
  const [query, setQuery] = useState("");
  const needle = query.normalize("NFKC").trim().toLocaleLowerCase();
  const shown = needle
    ? districts.filter((district) => district.search.includes(needle))
    : districts;
  return (
    <section className="section district-directory">
      <div className="district-directory-head">
        <h2>{t.allDistricts}</h2>
        <label className="district-search">
          <Search size={17} aria-hidden="true" />
          <span className="sr-only">{t.findDistrict}</span>
          <input
            type="search"
            value={query}
            placeholder={t.findDistrict}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {shown.length ? (
        <ul className="district-grid">
          {shown.map((district, i) => (
            <li
              key={district.slug}
              style={
                { "--row-accent": PALETTE[i % PALETTE.length] } as TileStyle
              }
            >
              <Link
                href={"/districts/" + district.slug}
                className="district-tile"
              >
                {district.cover && (
                  <span className="district-tile-image" aria-hidden="true">
                    <Image
                      src={district.cover}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, 280px"
                    />
                  </span>
                )}
                <span className="district-tile-body">
                  <span className="district-tile-name">
                    <MapPin size={15} aria-hidden="true" />
                    {district.name}
                    <ArrowUpRight
                      size={16}
                      aria-hidden="true"
                      className="district-tile-arrow"
                    />
                  </span>
                  {district.altName && (
                    <span className="district-tile-alt">
                      {district.altName}
                    </span>
                  )}
                  <span className="district-tile-headline">
                    {district.headline || t.noDistrictNews}
                  </span>
                  <span className="district-tile-count">
                    {district.count} {kn.news}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="district-empty" role="status">
          {t.noDistrictMatch}
        </p>
      )}
    </section>
  );
}
