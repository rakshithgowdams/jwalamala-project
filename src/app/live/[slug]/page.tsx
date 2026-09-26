import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { notFound } from "next/navigation";
import { getV4Rows } from "@/lib/v4/queries";
import { LiveUpdates } from "@/components/content/LiveUpdates";
import { SampleNotice } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";

import { site } from "@/config/site";
import { cleanHtml } from "@/lib/utils/sanitize";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const { slug } = await params;
  const blog = (await getV4Rows("liveblogs")).find((row) => row.slug === slug);
  if (!blog || blog.status !== "published") notFound();
  const updates = (await getV4Rows("liveblog_updates"))
    .filter((update) => update.liveblog_id === blog.id)
    .map((update) => ({
      ...update,
      body_html: cleanHtml(
        pickText(
          locale,
          update.body_html,
          update.body_html_en,
          update.body_html_hi,
        ),
      ),
    }));
  const title = pickText(locale, blog.title_kn, blog.title_en, blog.title_hi);
  return (
    <div className="container page-shell">
      {blog.is_seed && <SampleNotice />}
      <div className="page-heading">
        <span className="eyebrow">
          {blog.is_seed ? t.liveSample : blog.is_live ? kn.live : t.ended}
        </span>
        <h1>{title}</h1>
        <p>
          {pickText(locale, blog.summary_kn, blog.summary_en, blog.summary_hi)}
        </p>
      </div>
      <AdSlot placement="live-top" />
      <div className="article-layout">
        <LiveUpdates blogId={blog.id} updates={updates} isLive={blog.is_live} />
        <aside>
          <AdSlot placement="live-sidebar" format="rectangle" />
        </aside>
      </div>
      {!blog.is_seed && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LiveBlogPosting",
              headline: title,
              coverageStartTime: blog.published_at,
              datePublished: blog.published_at,
              url: site.url + "/live/" + blog.slug,
              liveBlogUpdate: updates.map((update) => ({
                "@type": "BlogPosting",
                datePublished: update.published_at,
                articleBody: cleanHtml(update.body_html).replace(
                  /<[^>]+>/g,
                  " ",
                ),
              })),
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </div>
  );
}
