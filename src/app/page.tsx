import { LocationFilter } from "@/components/search/LocationFilter";
import { getListing } from "@/lib/queries/listing";
import { HomeExtras } from "@/components/discovery/HomeExtras";
import { CategoryScrollShowcase } from "@/components/discovery/CategoryScrollShowcase";
import { HeritageStrip } from "@/components/discovery/HeritageStrip";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { Fragment } from "react";
import { getSetting } from "@/lib/v4/settings";
import { homeSchema, defaultHome } from "@/lib/v4/home";
import { JainTimesPanel } from "@/components/widgets/JainTimesPanel";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { ArrowRight, Send, CalendarDays, TrendingUp } from "lucide-react";

import { site } from "@/config/site";
import { getPosts, getEvents, getCategories } from "@/lib/queries/content";
import { HeroStory, NewsCard } from "@/components/news/NewsCard";
import { postHref } from "@/lib/utils/post-href";
import {
  SectionTitle,
  SampleNotice,
  EmptyState,
} from "@/components/ui/Primitives";
import { EventsTicker } from "@/components/events/EventsTicker";
import { BusinessAdShelf } from "@/components/ads/BusinessAds";
import { getBusinessAds } from "@/lib/ads/business-server";
import { pickBusinessAds } from "@/lib/ads/business";
export default async function Home() {
  const { kn, locale } = await getUiStrings();

  let posts: Awaited<ReturnType<typeof getPosts>> = [];
  let events: Awaited<ReturnType<typeof getEvents>> = [];
  let categoriesList: Awaited<ReturnType<typeof getCategories>> = [];
  try {
    [posts, events, categoriesList] = await Promise.all([
      getPosts(),
      getEvents(),
      getCategories(),
    ]);
  } catch {}
  let trending: Awaited<ReturnType<typeof getListing>>["rows"] = [];
  try {
    trending = (await getListing({ sort: "most_viewed" }, "1", 4)).rows;
  } catch {}
  const config = homeSchema
    .catch(defaultHome)
    .parse((await getSetting("homepage")) || defaultHome);
  const shops = pickBusinessAds(await getBusinessAds().catch(() => []), {
    count: 8,
  });
  const lead =
    posts.find((p) => p.id === config.lead_id) ||
    posts.find((p) => p.is_featured) ||
    posts[0];
  return (
    <div className="container home-page">
      {(site.demo || posts.some((post) => post.is_seed)) && <SampleNotice />}
      <details className="location-disclosure">
        <summary>{kn.newsNearYou}</summary>
        <LocationFilter filters={{}} action="/news" />
      </details>
      <AdSlot placement="home-top" />
      {config.sections
        .filter((s) => s.enabled)
        .map((section) => {
          const selected = posts.filter(
            (p) =>
              !section.category_slug ||
              p.category_slugs.includes(section.category_slug),
          );
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
                                {posts
                                  .filter((p) => p.id !== lead.id)
                                  .slice(0, 4)
                                  .map((p) => (
                                    <NewsCard key={p.id} post={p} compact />
                                  ))}
                                <AdSlot
                                  placement="home-sidebar"
                                  format="rectangle"
                                />
                              </aside>
                            </div>
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
                          <div className="category-chips">
                            {categoriesList.slice(0, 7).map((c) => (
                              <Link
                                href={`/category/${c.slug}`}
                                key={c.slug}
                                className="chip"
                              >
                                {pickText(
                                  locale,
                                  c.name_kn,
                                  c.name_en,
                                  c.name_hi,
                                )}
                              </Link>
                            ))}
                          </div>
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
      <CategoryScrollShowcase posts={posts} categories={categoriesList} />
      <BusinessAdShelf ads={shops} />
      <HomeExtras config={config} />
      <HeritageStrip />
      <AdSlot placement="home-bottom" />
    </div>
  );
}
