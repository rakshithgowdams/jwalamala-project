import {
  sitemapPage,
  sitemapKinds,
  type SitemapKind,
} from "@/lib/seo/sitemaps";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; page: string }> },
) {
  const { kind, page } = await params;
  if (
    (kind !== "pages" && !Object.hasOwn(sitemapKinds, kind)) ||
    !/^\d{1,6}$/.test(page)
  )
    return new Response("Not found", { status: 404 });
  return sitemapPage(kind as SitemapKind | "pages", Number(page));
}
