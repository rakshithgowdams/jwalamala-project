import { Fragment } from "react";
import { cleanHtml } from "@/lib/utils/sanitize";
import { articleSections } from "@/lib/ads/article-sections";
import { AdSlot } from "@/components/ads/AdSlot";
export function ArticleBody({
  html,
  hideAds = false,
  sponsored = false,
  language = "kn",
}: {
  html: string;
  hideAds?: boolean;
  sponsored?: boolean;
  language?: string;
}) {
  const safe = cleanHtml(html, sponsored);
  const sections = hideAds ? [safe] : articleSections(safe);
  return (
    <div id="article-body" className="prose" lang={language}>
      {sections.map((section, i) => (
        <Fragment key={i}>
          <div dangerouslySetInnerHTML={{ __html: section }} />
          {i < sections.length - 1 && (
            <AdSlot placement={"article_in_content_" + (i + 1)} />
          )}
        </Fragment>
      ))}
    </div>
  );
}
