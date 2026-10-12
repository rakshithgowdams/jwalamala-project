import Link from "next/link";
import { Flame, MapPin, Newspaper, Shapes, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { AdSlot } from "@/components/ads/AdSlot";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getCategories } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { activeTrending, safePublicLink } from "@/lib/v4/utils";
import { districtName, listDistricts } from "@/lib/utils/districts";
import type { Post } from "@/lib/types";
import { NewsCard } from "./NewsCard";

function Widget({
  icon,
  title,
  more,
  children,
}: {
  icon: ReactNode;
  title: string;
  more?: { href: string; label: string };
  children: ReactNode;
}) {
  return (
    <section className="sidebar-widget">
      <header className="sidebar-widget-head">
        <h2>
          {icon}
          {title}
        </h2>
        {more && <Link href={more.href}>{more.label}</Link>}
      </header>
      {children}
    </section>
  );
}

/**
 * Fills the article's right column: trending topics, the newest stories, an ad
 * in the middle, related reading, every category and the district pages.
 * Each block disappears when it has nothing to show.
 */
export async function ArticleSidebar({
  post,
  posts,
}: {
  post: Pick<Post, "id" | "type" | "hide_ads" | "category_slugs">;
  posts: Post[];
}) {
  const { locale } = await getUiStrings();
  const say = (kn: string, en: string, hi: string) => pickText(locale, kn, en, hi);
  const [trendingRows, categories, places] = await Promise.all([
    getV4Rows("trending_items").catch(() => []),
    getCategories().catch(() => []),
    getV4Rows("places").catch(() => []),
  ]);
  const trending = activeTrending(trendingRows).slice(0, 10);
  const others = posts.filter((x) => x.id !== post.id);
  const latest = others.slice(0, 5);
  const shown = new Set(latest.map((x) => x.id));
  const related = others
    .filter((x) => !shown.has(x.id) && x.category_slugs.some((c) => post.category_slugs.includes(c)))
    .slice(0, 4);
  const districts = listDistricts(places, locale);

  const widgets: ReactNode[] = [];
  if (trending.length)
    widgets.push(
      <Widget key="trending" icon={<Flame size={18} aria-hidden="true" />} title={say("ಟ್ರೆಂಡಿಂಗ್ ವಿಷಯಗಳು", "Trending topics", "ट्रेंडिंग विषय")}>
        <div className="sidebar-chips">
          {trending.map((item) => (
            <Link
              key={item.id}
              href={safePublicLink(item.url)!}
              className={"chip" + (item.is_highlight ? " highlight" : "")}
            >
              {item.type === "live" && <span className="status-dot" />}
              {pickText(locale, item.label_kn, item.label_en, item.label_hi)}
            </Link>
          ))}
        </div>
      </Widget>,
    );
  if (latest.length)
    widgets.push(
      <Widget
        key="latest"
        icon={<Newspaper size={18} aria-hidden="true" />}
        title={say("ಹೊಸ ಸುದ್ದಿಗಳು", "Latest news", "ताज़ा समाचार")}
        more={{ href: "/category/news", label: say("ಎಲ್ಲಾ", "All", "सभी") }}
      >
        <div className="sidebar-list">
          {latest.map((x) => (
            <NewsCard key={x.id} post={x} compact />
          ))}
        </div>
      </Widget>,
    );
  if (related.length)
    widgets.push(
      <Widget key="related" icon={<TrendingUp size={18} aria-hidden="true" />} title={say("ಇದನ್ನೂ ಓದಿ", "Read also", "यह भी पढ़ें")}>
        <div className="sidebar-list">
          {related.map((x) => (
            <NewsCard key={x.id} post={x} compact />
          ))}
        </div>
      </Widget>,
    );
  if (categories.length)
    widgets.push(
      <Widget key="categories" icon={<Shapes size={18} aria-hidden="true" />} title={say("ವರ್ಗಗಳು", "Categories", "श्रेणियाँ")}>
        <div className="sidebar-chips">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className={"chip" + (post.category_slugs.includes(c.slug) ? " active" : "")}
            >
              {pickText(locale, c.name_kn, c.name_en, c.name_hi)}
            </Link>
          ))}
        </div>
      </Widget>,
    );
  if (districts.length)
    widgets.push(
      <Widget
        key="districts"
        icon={<MapPin size={18} aria-hidden="true" />}
        title={say("ಜಿಲ್ಲಾ ಸುದ್ದಿ", "District news", "ज़िला समाचार")}
        more={{ href: "/districts", label: say("ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು", "All districts", "सभी ज़िले") }}
      >
        <div className="sidebar-chips">
          {districts.map((d) => (
            <Link key={d.id} href={`/districts/${d.slug}`} className="chip">
              {districtName(locale, d)}
            </Link>
          ))}
        </div>
      </Widget>,
    );
  // Ads go at the top, in the middle, after the categories and at the bottom;
  // where two would meet because a section is empty, only the first is kept.
  const ad = (placement: string) => (
    <AdSlot key={"ad-" + placement} disabled={post.hide_ads} placement={placement} format="rectangle" />
  );
  const middle = Math.ceil(widgets.length / 2);
  const column: { ad: boolean; node: ReactNode }[] = [{ ad: true, node: ad(`${post.type}-sidebar`) }];
  widgets.forEach((widget, i) => {
    if (i === middle) column.push({ ad: true, node: ad("article_sidebar_sticky") });
    column.push({ ad: false, node: widget });
    if ((widget as { key?: string }).key === "categories")
      column.push({ ad: true, node: ad("article-sidebar-categories") });
  });
  column.push({ ad: true, node: ad("article-sidebar-bottom") });

  return (
    <aside className="article-sidebar">
      {column.filter((item, i) => !(item.ad && column[i - 1]?.ad)).map((item) => item.node)}
    </aside>
  );
}

