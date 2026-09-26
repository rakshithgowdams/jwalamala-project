import { LocationFields } from "@/components/search/LocationFields";
import { matchesLocation, type LocationFilters } from "@/lib/utils/geography";
import { pickText } from "@/lib/i18n/content";
import { NearbyBasadis } from "./NearbyBasadis";
import { CommunityForm } from "./CommunityForm";
import { createClient } from "@supabase/supabase-js";
import { getUiStrings } from "@/lib/i18n/server";
import Link from "next/link";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { notFound } from "next/navigation";
import { getV4Rows } from "@/lib/v4/queries";
import { getPosts } from "@/lib/queries/content";
import { isoToday, formatDate } from "@/lib/utils/dates";
import { safePublicLink } from "@/lib/v4/utils";
import { NewsCard } from "@/components/news/NewsCard";
import { SampleNotice, EmptyState } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";

import { site } from "@/config/site";
import type { Locale } from "@/lib/i18n/strings";
import type { Basadi, Notice, Opportunity } from "@/lib/v4/types";
export type CommunityKind = "basadis" | "notices" | "opportunities";
type CommunityRow = Basadi | Notice | Opportunity;
const rowTitle = (locale: Locale, row: CommunityRow) =>
  "name_kn" in row
    ? pickText(locale, row.name_kn, row.name_en, row.name_hi)
    : pickText(locale, row.title_kn, row.title_en, row.title_hi);
const rowBody = (locale: Locale, row: CommunityRow) =>
  "history_kn" in row
    ? pickText(locale, row.history_kn, row.history_en, row.history_hi)
    : "body_kn" in row
      ? pickText(locale, row.body_kn, row.body_en, row.body_hi)
      : pickText(
          locale,
          row.description_kn,
          row.description_en,
          row.description_hi,
        );
export async function CommunityList({
  kind,
  filters,
}: {
  kind: CommunityKind;
  filters: LocationFilters & { kind?: string; q?: string };
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const [rows, places] = await Promise.all([
    getV4Rows(kind),
    getV4Rows("places"),
  ]);
  const title = {
    basadis: t.basadis,
    notices: t.notices,
    opportunities: t.opportunities,
  }[kind];
  const placeName = (id: string) => {
    const place = places.find((p) => p.id === id);
    return place
      ? pickText(locale, place.name_kn, place.name_en, place.name_hi)
      : "";
  };
  const filtered = rows.filter((row) => {
    if ("last_date" in row && row.last_date < isoToday()) return false;
    if ("status" in row && !["approved", "published"].includes(row.status))
      return false;
    const place = places.find((p) => p.id === row.place_id);
    const name = rowTitle(locale, row);
    return (
      matchesLocation(place, filters) &&
      (!filters.q || name.includes(filters.q)) &&
      (!filters.kind ||
        ("kind" in row && row.kind === filters.kind) ||
        ("type" in row && row.type === filters.kind))
    );
  });

  return (
    <div className="container page-shell">
      {site.demo && <SampleNotice />}
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">{kn.community}</span>
          <h1>{title}</h1>
        </div>
        {kind !== "basadis" && (
          <Link className="button button-ember" href={"/" + kind + "/submit"}>
            {kind === "notices" ? t.submitNotice : t.submitOpportunity}
          </Link>
        )}
      </div>
      {kind === "basadis" && (
        <NearbyBasadis
          places={rows.filter(
            (r): r is Extract<typeof r, { lat: number | null }> => "lat" in r,
          )}
        />
      )}
      <form className="public-filter">
        <label className="field">
          {kn.search}
          <input name="q" defaultValue={filters.q} />
        </label>
        <LocationFields
          key={[filters.state, filters.district, filters.city].join("/")}
          places={places}
          filters={filters}
        />
        {kind === "opportunities" && (
          <label className="field">
            {t.contentType}
            <select name="kind" defaultValue={filters.kind || ""}>
              <option value="">{kn.all}</option>
              {(
                ["job", "scholarship", "competition", "admission"] as const
              ).map((k) => (
                <option value={k} key={k}>
                  {t[k]}
                </option>
              ))}
            </select>
          </label>
        )}
        <button className="button button-ember">{kn.filter}</button>
        <Link className="button button-outline" href={"/" + kind}>
          {kn.clear}
        </Link>
      </form>
      <AdSlot placement={kind + "-top"} />
      {filtered.length ? (
        <div className="community-grid">
          {filtered.map((row) => (
            <article className="community-card" key={row.id}>
              <span className="eyebrow">{placeName(row.place_id)}</span>
              <h2>
                <Link href={"/" + kind + "/" + row.slug}>
                  {rowTitle(locale, row)}
                </Link>
              </h2>
              <p>{rowBody(locale, row)}</p>
              {"last_date" in row && (
                <p className="meta">
                  {t.deadline}: {formatDate(row.last_date, false, locale)}
                </p>
              )}
              <Link className="chip" href={"/" + kind + "/" + row.slug}>
                {t.read}
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <AdSlot placement={kind + "-bottom"} />
    </div>
  );
}
export async function CommunityDetail({
  kind,
  slug,
}: {
  kind: CommunityKind;
  slug: string;
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const [rows, places] = await Promise.all([
    getV4Rows(kind),
    getV4Rows("places"),
  ]);
  const row = rows.find((row) => row.slug === slug);
  if (
    !row ||
    ("last_date" in row && row.last_date < isoToday()) ||
    !["approved", "published"].includes(row.status)
  )
    notFound();
  const obituary = "type" in row && row.type === "shraddhanjali";
  const place = places.find((p) => p.id === row.place_id);
  let condolences: { id: string; name: string; message: string }[] = [];
  if (obituary && !site.demo) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const db = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await db
        .from("notice_messages")
        .select("id,name,message")
        .eq("notice_id", row.id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(100);
      condolences = data || [];
    }
  }
  const title = rowTitle(locale, row);
  return (
    <div
      className={"container page-shell " + (obituary ? "obituary-page" : "")}
    >
      {site.demo && <SampleNotice />}
      <div className="breadcrumb">
        <Link href={"/" + kind}>
          {kind === "basadis"
            ? t.basadis
            : kind === "notices"
              ? t.notices
              : t.opportunities}
        </Link>
      </div>
      <div className="article-header">
        <span className="eyebrow">
          {obituary
            ? t.obituary
            : place &&
              pickText(locale, place.name_kn, place.name_en, place.name_hi)}
        </span>
        <h1>{title}</h1>
        {"event_date" in row && (
          <p>{formatDate(row.event_date, false, locale)}</p>
        )}
      </div>
      {!obituary && <AdSlot placement={kind + "-detail-top"} />}
      {"photos" in row && row.photos[0] && (
        <>
          <div className="article-image">
            <Image
              src={row.photos[0].url}
              alt={title}
              fill
              sizes="(max-width:900px) 100vw, 800px"
            />
          </div>
          <p className="meta">
            {t.credit}: {row.photos[0].credit}
          </p>
        </>
      )}
      <div className="prose">
        <p>{rowBody(locale, row)}</p>
      </div>
      {"timings_kn" in row && (
        <div className="utility-panel">
          <h2>{t.timings}</h2>
          <p>
            {pickText(locale, row.timings_kn, row.timings_en, row.timings_hi)}
          </p>
          {row.lat !== null && row.lng !== null && (
            <a
              className="chip"
              href={
                "https://www.google.com/maps/search/?api=1&query=" +
                row.lat +
                "," +
                row.lng
              }
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.map}
            </a>
          )}
        </div>
      )}
      {"last_date" in row && (
        <div className="utility-panel">
          <p>
            {t.organisation}:{" "}
            {pickText(locale, row.org, row.org_en, row.org_hi)}
          </p>
          <p>
            {t.deadline}: {formatDate(row.last_date, false, locale)}
          </p>
          {row.link && safePublicLink(row.link) && (
            <a
              className="button button-ember"
              href={safePublicLink(row.link)!}
              rel="noopener noreferrer"
              target="_blank"
            >
              {t.apply}
            </a>
          )}
        </div>
      )}
      {row.contact && (
        <p>
          {kn.contact}: {row.contact}
        </p>
      )}
      {kind === "basadis" && (
        <section className="section">
          <h2>{t.relatedNews}</h2>
          <div className="news-grid">
            {(await getPosts())
              .filter((post) => post.event_place === place?.name_kn)
              .slice(0, 3)
              .map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
          </div>
        </section>
      )}
      {obituary && (
        <section className="utility-panel">
          <h2>{kn.condolenceMessages}</h2>
          {condolences.map((c) => (
            <blockquote key={c.id}>
              <p>{c.message}</p>
              <cite>{c.name}</cite>
            </blockquote>
          ))}
          <p>{kn.messagesAfterReview}</p>
          <CommunityForm kind="condolence" targetId={row.id} title={title} />
        </section>
      )}
      {!obituary && <AdSlot placement={kind + "-detail-bottom"} />}
    </div>
  );
}
