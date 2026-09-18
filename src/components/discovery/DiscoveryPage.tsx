import { getListing } from "@/lib/queries/listing";
import { Pagination } from "@/components/ui/Pagination";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getPosts, getEvents } from "@/lib/queries/content";
import { getV4Rows } from "@/lib/v4/queries";
import { topicPosts, paginate } from "@/lib/v4/utils";
import { NewsCard } from "@/components/news/NewsCard";
import { AdSlot } from "@/components/ads/AdSlot";
import {
  SampleNotice,
  EmptyState,
  SectionTitle,
} from "@/components/ui/Primitives";
import { EventCard } from "@/components/events/EventCard";
import { site } from "@/config/site";
import { FollowButton } from "@/components/engagement/FollowButton";
import type { Topic } from "@/lib/v4/types";
export type DiscoveryKind = "tag" | "topic" | "place" | "author" | "series";
export async function discoveryMetadata(kind: DiscoveryKind, slug: string) {
  const { kn } = await getUiStrings();
  const table = {
    tag: "tags",
    topic: "topics",
    place: "places",
    author: "authors",
    series: "series",
  } as const;
  const row = (await getV4Rows(table[kind])).find((row) => row.slug === slug);
  return {
    title: row ? ("title_kn" in row ? row.title_kn : row.name_kn) : kn.notFound,
    alternates: { canonical: `/${kind}/${slug}` },
  };
}
export async function DiscoveryPage({
  kind,
  slug,
  page,
}: {
  kind: DiscoveryKind;
  slug: string;
  page?: string;
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const table = {
    tag: "tags",
    topic: "topics",
    place: "places",
    author: "authors",
    series: "series",
  } as const;
  const [rows, allPosts, tags, links] = await Promise.all([
    getV4Rows(table[kind]),
    site.demo ? getPosts() : Promise.resolve([]),
    getV4Rows("tags"),
    getV4Rows("post_tags"),
  ]);
  const row = rows.find((row) => row.slug === slug);
  if (!row) notFound();
  let posts = allPosts;
  let topic: Topic | undefined;
  let description = "";
  let englishTitle = "";
  if (kind === "tag") {
    const tag = tags.find((tag) => tag.slug === slug)!;
    if (tag.merged_into_id) {
      const merged = tags.find((t) => t.id === tag.merged_into_id);
      if (merged) permanentRedirect("/tag/" + merged.slug);
    }
    const ids = new Set(
      links
        .filter((link) => link.tag_id === row.id)
        .map((link) => link.post_id),
    );
    posts = posts.filter((post) => ids.has(post.id));
  } else if (kind === "topic") {
    topic = (await getV4Rows("topics")).find((item) => item.id === row.id)!;
    if (!topic.is_active) notFound();
    posts = topicPosts(topic, await getV4Rows("topic_pins"), links, posts);
    description = topic.intro_kn;
  } else if (kind === "place") {
    const place = (await getV4Rows("places")).find((p) => p.id === row.id)!;
    englishTitle = place.name_en;
    posts = posts.filter(
      (post) =>
        post.event_place === place.name_kn || post.place_id === place.id,
    );
  } else if (kind === "author") {
    const author = (await getV4Rows("authors")).find((p) => p.id === row.id)!;
    if (!author.is_active) notFound();
    posts = posts.filter(
      (post) =>
        post.public_author_id === author.id ||
        (site.demo && author.slug === "jwalamala-desk"),
    );
    description = author.bio_kn + " " + author.credentials_kn;
  } else {
    const series = (await getV4Rows("series")).find((p) => p.id === row.id)!;
    if (!series.is_active) notFound();
    const episodes = (await getV4Rows("series_items"))
      .filter((item) => item.series_id === series.id)
      .sort((a, b) => a.episode_no - b.episode_no);
    posts = episodes.flatMap((item) =>
      allPosts.filter((post) => post.id === item.post_id),
    );
    description = series.description_kn;
  }
  const title = pickText(
    locale,
    "title_kn" in row ? row.title_kn : row.name_kn,
    englishTitle,
  );
  const results = site.demo
    ? { ...paginate(posts, page), total: posts.length }
    : await getListing(
        kind === "place" ? { place_id: row.id } : { [kind]: slug },
        page,
      );
  const events = topic
    ? (await getEvents()).filter((event) => topic.event_ids.includes(event.id))
    : [];
  return (
    <div className="container page-shell">
      {site.demo && <SampleNotice />}
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        {title}
      </div>
      <div className="discovery-heading">
        <div>
          <span className="eyebrow">
            {kind === "topic"
              ? t.topics
              : kind === "series"
                ? t.series
                : kind === "place"
                  ? t.places
                  : kind === "author"
                    ? t.authors
                    : t.tags}
          </span>
          <h1>{title}</h1>
          {description && <p>{description}</p>}
          <span className="meta">
            {results.total} {kn.news}
          </span>
        </div>
        <FollowButton targetType={kind} targetId={row.id} label={title} />
      </div>
      {topic && topic.key_facts.length > 0 && (
        <section className="facts-panel">
          <h2>{t.keyFacts}</h2>
          <ul>
            {topic.key_facts.map((fact, i) => (
              <li key={i}>{fact}</li>
            ))}
          </ul>
        </section>
      )}
      {topic && topic.timeline.length > 0 && (
        <details className="timeline-panel">
          <summary>{t.timeline}</summary>
          {topic.timeline.map((entry, i) => (
            <p key={i}>
              <time>{entry.date}</time> — {entry.text}
            </p>
          ))}
        </details>
      )}
      {topic?.liveblog_post_id && (
        <Link
          className="chip"
          href={
            "/live/" +
            ((await getV4Rows("liveblogs")).find(
              (blog) => blog.id === topic.liveblog_post_id,
            )?.slug || "")
          }
        >
          {t.liveblog}
        </Link>
      )}
      <AdSlot placement={kind + "-top"} />
      <div className="ad-supported-layout">
        <section className="ad-supported-content">
          {results.rows.length ? (
            <div className="news-grid">
              {results.rows.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          <Pagination page={results.page} pages={results.pages} />
        </section>
        <aside className="ad-sidebar">
          <AdSlot placement={kind + "-sidebar"} format="rectangle" />
          <SectionTitle>{t.popularTags}</SectionTitle>
          <div className="category-chips">
            {tags
              .filter(
                (tag) => !tag.merged_into_id && !tag.is_hidden_from_trending,
              )
              .map((tag) => (
                <Link className="chip" href={"/tag/" + tag.slug} key={tag.id}>
                  #{tag.name_kn}
                </Link>
              ))}
          </div>
        </aside>
      </div>
      {events.length > 0 && (
        <section className="section">
          <SectionTitle>{kn.events}</SectionTitle>
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </section>
      )}
      {kind === "place" && (
        <section className="section">
          <SectionTitle href="/basadis">{t.basadis}</SectionTitle>
          {(await getV4Rows("basadis"))
            .filter(
              (item) => item.place_id === row.id && item.status === "published",
            )
            .map((item) => (
              <Link
                className="directory-link"
                key={item.id}
                href={"/basadis/" + item.slug}
              >
                {item.name_kn}
              </Link>
            ))}
        </section>
      )}
      <AdSlot placement={kind + "-bottom"} />
    </div>
  );
}
