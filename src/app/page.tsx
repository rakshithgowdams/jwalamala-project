import { getListing } from "@/lib/queries/listing";
import { HomeExtras } from "@/components/discovery/HomeExtras";
import { CategoryScrollShowcase } from "@/components/discovery/CategoryScrollShowcase";
import { HeritageStrip } from "@/components/discovery/HeritageStrip";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { Fragment } from "react";
import { getSetting } from "@/lib/v4/settings";
import { homeSchema, defaultHome, defaultLatestLinks } from "@/lib/v4/home";
import { JainTimesPanel } from "@/components/widgets/JainTimesPanel";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { ArrowRight, Send, CalendarDays, TrendingUp } from "lucide-react";

import { getPosts, getEvents, getCategories } from "@/lib/queries/content";
import { HeroStory, NewsCard } from "@/components/news/NewsCard";
import { postHref } from "@/lib/utils/post-href";
import {
  SectionTitle,
  EmptyState,
} from "@/components/ui/Primitives";
import { EventsTicker } from "@/components/events/EventsTicker";
import { BusinessAdShelf } from "@/components/ads/BusinessAds";
import { getBusinessAds } from "@/lib/ads/business-server";
import { pickBusinessAds } from "@/lib/ads/business";
import { toCardPost } from "@/lib/utils/card-post";
export default async function Home() {
  const { kn, locale } = await getUiStrings();

  const [allPosts, events, categoriesList, trending, homeSetting, shopRows] = await Promise.all([
    getPosts().catch(() => []),
    getEvents().catch(() => []),
    getCategories().catch(() => []),
    getListing({ sort: "most_viewed" }, "1", 4)
      .then((result) => result.rows)
      .catch(() => []),
    getSetting("homepage").catch(() => null),
    getBusinessAds().catch(() => []),
  ]);
  const config = homeSchema.catch(defaultHome).parse(homeSetting || defaultHome);
  const shops = pickBusinessAds(shopRows, { count: 8 });
  const posts = allPosts.map(toCardPost);
  const showcaseIds = new Set<string>();
  let showcaseRows = 0;
  for (const category of categoriesList) {
    if (showcaseRows === 8) break;
    const items = posts.filter((p) => p.category_slugs.includes(category.slug)).slice(0, 10);
    if (items.length < 2) continue;
    showcaseRows++;
    for (const item of items) showcaseIds.add(item.id);
  }
  const showcasePosts = posts.filter((p) => showcaseIds.has(p.id));
  const lead =
    posts.find((p) => p.id === config.lead_id) ||
    posts.find((p) => p.is_featured) ||
    posts[0];
  return (
    <div className="container home-page">
      <AdSlot placement="home-top" />
      {config.sections
        .filter((s) => s.enabled)
        .map((section) => {
          const pool = posts.filter(
            (p) =>
              !section.category_slug ||
              p.category_slugs.includes(section.category_slug),
          );
          const pinnedLatest =
            section.id === "latest"
              ? config.latest_ids
                  .map((id) => pool.find((p) => p.id === id))
                  .filter((p): p is (typeof pool)[number] => Boolean(p))
              : [];
          const pinnedIds = new Set(pinnedLatest.map((p) => p.id));
          const selected =
            section.id === "latest"
              ? [
                  ...pinnedLatest,
                  ...pool.filter((p) => !pinnedIds.has(p.id)),
                ]
              : pool;
          return (
            <Fragment key={section.id}>
              {(() => {
                switch (section.id) {
                  case "lead":
                    return (
                      <>
                        {" "}
                        {lead ? (
                          <>
                            <div className="ticker">
                              <span>
                                <span className="status-dot" />
                                {kn.breaking}
                              </span>
                              <Link href={postHref(lead)}>
                                {pickText(
                                  locale,
                                  lead.title_kn,
                                  lead.title_en,
                                  lead.title_hi,
                                )}
                              </Link>
                              <ArrowRight size={19} />
                            </div>
                            <div className="lead-grid">
                              <HeroStory post={lead} />
                              <aside className="latest-panel">
                                <SectionTitle
                                  href="/category/news"
                                  label={kn.allNews}
                                >
                                  {kn.latest}
                                </SectionTitle>
                                {(() => {
                                  const asidePinned = config.latest_ids
                                    .map((id) => posts.find((p) => p.id === id))
                                    .filter(
                                      (p): p is (typeof posts)[number] =>
                                        Boolean(p) && p!.id !== lead.id,
                                    );
                                  const asideIds = new Set(asidePinned.map((p) => p.id));
                                  return [
                                    ...asidePinned,
                                    ...posts.filter(
                                      (p) => p.id !== lead.id && !asideIds.has(p.id),
                                    ),
                                  ]
                                    .slice(0, 4)
                                    .map((p) => (
                                      <NewsCard key={p.id} post={p} compact />
                                    ));
                                })()}
                              </aside>
                            </div>
                            <AdSlot placement="home-after-hero" format="wide" />
                          </>
                        ) : (
                          <EmptyState />
                        )}
                      </>
                    );
                  case "events":
                    return (
                      <>
                        {" "}
                        <section className="events-strip">
                          <div className="events-strip-heading">
                            <CalendarDays size={25} />
                            <div>
                              <span className="eyebrow">{kn.calendar}</span>
                              <h2>{kn.upcoming}</h2>
                            </div>
                          </div>
                          <EventsTicker
                            events={events
                              .filter(
                                (e) =>
                                  e.end_date >=
                                  new Date().toLocaleDateString("en-CA", {
                                    timeZone: "Asia/Kolkata",
                                  }),
                              )
                              .slice(0, section.count)}
                          />
                          <Link
                            href="/events"
                            className="icon-button"
                            aria-label={kn.allEvents}
                          >
                            <ArrowRight size={24} />
                          </Link>
                        </section>
                      </>
                    );
                  case "latest":
                    return (
                      <>
                        {" "}
                        <section className="section">
                          <SectionTitle
                            href="/category/news"
                            label={kn.allNews}
                          >
                            {kn.news}
                          </SectionTitle>
                          <nav
                            className="category-chips latest-news-slides"
                            aria-label={kn.latest}
                          >
                            {(config.latest_links?.length
                              ? config.latest_links
                              : defaultLatestLinks
                            )
                              .filter((link) => link.enabled)
                              .map((link) => (
                                <Link
                                  href={link.href}
                                  key={link.id}
                                  className="chip"
                                >
                                  {pickText(
                                    locale,
                                    link.label_kn,
                                    link.label_en,
                                    link.label_hi,
                                  )}
                                </Link>
                              ))}
                          </nav>
                          <div className="news-grid">
                            {selected.slice(0, section.count).map((p) => (
                              <NewsCard key={p.id} post={p} />
                            ))}
                          </div>
                        </section>
                      </>
                    );
                  case "videos":
                    return (
                      <>
                        {" "}
                        <section className="video-band">
                          <SectionTitle href="/videos" label={kn.allVideos}>
                            {kn.videos}
                          </SectionTitle>
                          <div className="news-grid">
                            {selected
                              .filter((p) => p.type === "video")
                              .slice(0, section.count)
                              .map((p) => (
                                <NewsCard key={p.id} post={p} />
                              ))}
                          </div>
                        </section>
                      </>
                    );
                  case "explore":
                    return (
                      <>
                        {" "}
                        <section className="lower-grid">
                          <div>
                            <SectionTitle href="/category/basadi">
                              {kn.explore}
                            </SectionTitle>
                            <div className="news-grid two">
                              {posts.slice(7, 9).map((p) => (
                                <NewsCard key={p.id} post={p} />
                              ))}
                            </div>
                          </div>
                          <aside>
                            <SectionTitle>
                              <TrendingUp size={23} />
                              {kn.trending}
                            </SectionTitle>
                            {trending.map((p, i) => (
                              <Link
                                className="trending-item"
                                key={p.id}
                                href={postHref(p)}
                              >
                                <span>{String(i + 1).padStart(2, "0")}</span>
                                <h3>
                                  {pickText(
                                    locale,
                                    p.title_kn,
                                    p.title_en,
                                    p.title_hi,
                                  )}
                                </h3>
                              </Link>
                            ))}
                          </aside>
                        </section>
                      </>
                    );
                  case "jain":
                    return (
                      <>
                        <JainTimesPanel />
                      </>
                    );
                  case "submit":
                    return (
                      <>
                        {" "}
                        <section className="send-banner">
                          <Send size={37} />
                          <div>
                            <h2>{kn.sendTitle}</h2>
                            <p>{kn.sendDescription}</p>
                          </div>
                          <Link href="/contact" className="button button-ember">
                            {kn.sendNews}
                            <ArrowRight size={17} />
                          </Link>
                        </section>
                      </>
                    );
                  case "picks":
                    return (
                      <>
                        <section className="section">
                          <SectionTitle>{kn.editorPicks}</SectionTitle>
                          <div className="news-grid">
                            {config.pick_ids
                              .map((id) => posts.find((p) => p.id === id))
                              .filter((p) => p !== undefined)
                              .slice(0, section.count)
                              .map((p) => (
                                <NewsCard key={p.id} post={p} />
                              ))}
                          </div>
                        </section>
                      </>
                    );
                }
              })()}
              {section.id === "latest" && selected.length > 0 && (
                <AdSlot placement="home-in-feed" />
              )}
            </Fragment>
          );
        })}
      <CategoryScrollShowcase posts={showcasePosts} categories={categoriesList} />
      <BusinessAdShelf ads={shops} />
      <HomeExtras config={config} />
      <HeritageStrip />
      <AdSlot placement="home-bottom" />
    </div>
  );
}
