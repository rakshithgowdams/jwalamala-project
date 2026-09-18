import { headers } from "next/headers";
import { getV4Rows } from "@/lib/v4/queries";
import { site } from "@/config/site";
import { ampStory } from "@/lib/seo/amp";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params,
    story = (await getV4Rows("web_stories")).find(
      (s) => s.slug === slug && s.status === "published",
    );
  if (!story) return new Response("Not found", { status: 404 });
  const nonce = (await headers()).get("x-nonce") || "";
  return new Response(ampStory(story, site, nonce), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": nonce ? "private, no-store" : "public, max-age=300",
      "Content-Security-Policy":
        "default-src 'self'; script-src https://cdn.ampproject.org 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src https://cdn.ampproject.org; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    },
  });
}
