import {
  sitemapIndex,
  sitemapKinds,
  type SitemapKind,
} from "@/lib/seo/sitemaps";
export const dynamic = "force-dynamic";
export async function GET() {
  return sitemapIndex(
    Object.keys(sitemapKinds).filter(
      (k) => !["images", "news"].includes(k),
    ) as SitemapKind[],
    true,
  );
}
