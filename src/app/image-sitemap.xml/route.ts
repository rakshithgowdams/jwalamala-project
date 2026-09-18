import { sitemapIndex } from "@/lib/seo/sitemaps";
export const dynamic = "force-dynamic";
export async function GET() {
  return sitemapIndex(["images"]);
}
