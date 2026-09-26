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
import type { Topic, Tag, Place, Author, Series } from "@/lib/v4/types";
import type { Locale } from "@/lib/i18n/strings";
export type DiscoveryKind = "tag" | "topic" | "place" | "author" | "series";
function rowTitle(locale: Locale, row: Tag | Topic | Place | Author | Series) {
  return "title_kn" in row
    ? pickText(locale, row.title_kn, row.title_en, row.title_hi)
    : pickText(
        locale,
        row.name_kn,
        "name_en" in row ? row.name_en : null,
        row.name_hi,
      );
}
export async function discoveryMetadata(kind: DiscoveryKind, slug: string) {
  const { kn, locale } = await getUiStrings();
  const table = {
    tag: "tags",
    topic: "topics",
    place: "places",
    author: "authors",
    series: "series",
  } as const;
  const row = (await getV4Rows(table[kind])).find((row) => row.slug === slug);
  return {
    title: row ? rowTitle(locale, row) : kn.notFound,
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
    description = pickText(
      locale,
      topic.intro_kn,
      topic.intro_en,
      topic.intro_hi,
    );
  } else if (kind === "place") {
    const place = (await getV4Rows("places")).find((p) => p.id === row.id)!;
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
    description =
      pickText(locale, author.bio_kn, author.bio_en, author.bio_hi) +
      " " +
      pickText(
        locale,
        author.credentials_kn,
        author.credentials_en,
        author.credentials_hi,
      );
  } else {
    const series = (await getV4Rows("series")).find((p) => p.id === row.id)!;
    if (!series.is_active) notFound();
    const episodes = (await getV4Rows("series_items"))
      .filter((item) => item.series_id === series.id)
      .sort((a, b) => a.episode_no - b.episode_no);
    posts = episodes.flatMap((item) =>
      allPosts.filter((post) => post.id === item.post_id),
    );
    description = pickText(
      locale,
      series.description_kn,
      series.description_en,
      series.description_hi,
    );
  }
  const title = rowTitle(locale, row);
  const results = site.demo
    ? { ...paginate(posts, page), total: posts.length }
    : await getListing(
        kind === "place" ? { place_id: row.id } : { [kind]: slug },
        page,
      );
  const events = topic
    ? (await getEvents()).filter((event) => topic.event_ids.includes(event.id))
    : [];
  const englishFacts =
    topic && topic.key_facts_en?.length === topic.key_facts.length
      ? topic.key_facts_en
      : null;
  const hindiFacts =
    topic && topic.key_facts_hi?.length === topic.key_facts.length
      ? topic.key_facts_hi
      : null;
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
              <li key={i}>
                {pickText(locale, fact, englishFacts?.[i], hindiFacts?.[i])}
              </li>
            ))}
          </ul>
        </section>
      )}
      {topic && topic.timeline.length > 0 && (
        <details className="timeline-panel">
          <summary>{t.timeline}</summary>
          {topic.timeline.map((entry, i) => (
            <p key={i}>
              <time>{entry.date}</time> —{" "}
              {pickText(locale, entry.text, entry.text_en, entry.text_hi)}
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
                  #{pickText(locale, tag.name_kn, tag.name_en, tag.name_hi)}
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
                {pickText(locale, item.name_kn, item.name_en, item.name_hi)}
              </Link>
            ))}
        </section>
      )}
      <AdSlot placement={kind + "-bottom"} />
    </div>
  );
}
