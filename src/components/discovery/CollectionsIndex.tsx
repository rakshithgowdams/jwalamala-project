import { getUiStrings } from "@/lib/i18n/server";
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
  const { v4: t } = await getUiStrings();

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
              <h2>{row.title_kn}</h2>
              <p>
                {"intro_kn" in row
                  ? row.intro_kn
                  : "description_kn" in row
                    ? row.description_kn
                    : "summary_kn" in row
                      ? row.summary_kn
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
