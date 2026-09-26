import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { getV4Rows } from "@/lib/v4/queries";
import { SampleNotice, EmptyState } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";
import { site } from "@/config/site";

export async function CollectionsIndex({
  kind,
}: {
  kind: "topics" | "series" | "gallery" | "stories" | "live";
}) {
  const { v4: t, locale } = await getUiStrings();

  const table = {
    topics: "topics",
    series: "series",
    gallery: "galleries",
    stories: "web_stories",
    live: "liveblogs",
  } as const;
  const route = {
    topics: "topic",
    series: "series",
    gallery: "gallery",
    stories: "stories",
    live: "live",
  } as const;
  const rows = await getV4Rows(table[kind]);
  const title = {
    topics: t.topics,
    series: t.series,
    gallery: t.gallery,
    stories: t.stories,
    live: t.liveblogs,
  }[kind];
  return (
    <div className="container page-shell">
      {site.demo && <SampleNotice />}
      <div className="page-heading">
        <h1>{title}</h1>
      </div>
      <AdSlot placement={kind + "-top"} />
      {rows.length ? (
        <div className="collection-grid">
          {rows.map((row) => (
            <Link
              className="collection-card"
              href={"/" + route[kind] + "/" + row.slug}
              key={row.id}
            >
              {("cover_url" in row || "images" in row) && (
                <div className="collection-image">
                  <Image
                    src={
                      "cover_url" in row
                        ? row.cover_url
                        : row.images[0]?.url || site.logo
                    }
                    alt=""
                    fill
                    sizes="(max-width:640px) 100vw, 380px"
                  />
                </div>
              )}
              <h2>
                {pickText(locale, row.title_kn, row.title_en, row.title_hi)}
              </h2>
              <p>
                {"intro_kn" in row
                  ? pickText(locale, row.intro_kn, row.intro_en, row.intro_hi)
                  : "description_kn" in row
                    ? pickText(
                        locale,
                        row.description_kn,
                        row.description_en,
                        row.description_hi,
                      )
                    : "summary_kn" in row
                      ? pickText(
                          locale,
                          row.summary_kn,
                          row.summary_en,
                          row.summary_hi,
                        )
                      : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <AdSlot placement={kind + "-bottom"} />
    </div>
  );
}
