import { PreferredSource } from "@/components/engagement/PreferredSource";
import { ArticleBody } from "./ArticleBody";
import { getUiStrings } from "@/lib/i18n/server";
import { brandName, pickText } from "@/lib/i18n/content";
import { localizePlace } from "@/lib/i18n/places";
import { getPlaceNames } from "@/lib/i18n/places-server";
import type { Locale } from "@/lib/i18n/strings";
import { LazyComments as Comments } from "@/components/ui/LazyComponents";
import { getSetting } from "@/lib/v4/settings";
import { commentSettingsSchema, defaultComments } from "@/lib/v4/comments";
import { ArticleAudio } from "@/components/content/ArticleAudio";
import { ArticlePulse } from "@/components/engagement/ArticlePulse";
import { Reactions } from "@/components/engagement/Reactions";
import { ReadingTools } from "@/components/engagement/ReadingTools";
import { getV4Rows } from "@/lib/v4/queries";
import { AdSlot } from "@/components/ads/AdSlot";
import Link from "next/link";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/queries/content";
import { site } from "@/config/site";
import { formatDate } from "@/lib/utils/dates";
import { EventDateBadge, SectionTitle } from "@/components/ui/Primitives";
import { NewsCard } from "./NewsCard";
import { postHref } from "@/lib/utils/post-href";
import { BookmarkButton, ShareButtons } from "./PostActions";
import { LiteVideoEmbed } from "./LiteVideoEmbed";
/**
 * Which language the article body is shown in. `?lang=` wins so the
 * "read in ..." chips still work either way, but with no parameter the reader's
 * chosen interface language decides: switching the site to Hindi should not
 * leave the headline and body in Kannada.
 */
function articleLanguageFor(requested: string | undefined, locale: Locale) {
  return requested || locale;
}
export async function articleMetadata(slug: string, language?: string) {
  const { kn, locale } = await getUiStrings();
  const original = await getPost(slug);
  if (!original) return { title: kn.notFound };
  const hasEnglish = !!original.body_en && !!original.title_en;
  const hasHindi = !!original.body_hi && !!original.title_hi;
  const shown = articleLanguageFor(language, locale);
  const english = shown === "en" && hasEnglish;
  const hindi = shown === "hi" && hasHindi;
  const p = english
    ? {
        ...original,
        title_kn: original.title_en,
        summary_kn: original.summary_en || "",
        seo_title: original.title_en,
        seo_description: original.summary_en || "",
      }
    : hindi
      ? {
          ...original,
          title_kn: original.title_hi!,
          summary_kn: original.summary_hi || "",
          seo_title: original.title_hi,
          seo_description: original.summary_hi || "",
        }
      : original;
  return {
    robots: {
      index: !p.is_seed,
      follow: !p.is_seed,
      noarchive: true,
      "max-image-preview": "large" as const,
    },
    title: p.seo_title || p.title_kn,
    description: p.seo_description || p.summary_kn,
    alternates: {
      // Keyed off the query parameter, not the reader's cookie, so one URL
      // always reports the same canonical to crawlers.
      canonical:
        postHref(p) +
        (language === "en" ? "?lang=en" : language === "hi" ? "?lang=hi" : ""),
      languages: {
        kn: postHref(p),
        ...(hasEnglish ? { en: postHref(p) + "?lang=en" } : {}),
        ...(hasHindi ? { hi: postHref(p) + "?lang=hi" } : {}),
        ...(hasEnglish || hasHindi ? { "x-default": postHref(p) } : {}),
      },
    },
    openGraph: {
      title: p.title_kn,
      description: p.summary_kn,
      type: "article" as const,
      images: [new URL(p.thumbnail_url, site.url).href],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: p.title_kn,
      description: p.summary_kn,
      images: [new URL(p.thumbnail_url, site.url).href],
    },
  };
}
export async function ArticlePage({
  slug,
  language,
}: {
  slug: string;
  language?: string;
}) {
  const { kn, v4: t, locale } = await getUiStrings();

  const original = await getPost(slug);
  if (!original) notFound();
  const hasEnglish = !!original.body_en && !!original.title_en;
  const hasHindi = !!original.body_hi && !!original.title_hi;
  const shown = articleLanguageFor(language, locale);
  const english = shown === "en" && hasEnglish;
  const hindi = shown === "hi" && hasHindi;
  const p = english
    ? {
        ...original,
        title_kn: original.title_en,
        summary_kn: original.summary_en || "",
        body_html: original.body_en!,
        summary_points: [],
      }
    : hindi
      ? {
          ...original,
          title_kn: original.title_hi!,
          summary_kn: original.summary_hi || "",
          body_html: original.body_hi!,
          summary_points: [],
        }
      : original;
  const articleLanguage = english ? "en" : hindi ? "hi" : "kn";
  const copyrightYear = new Date(p.published_at).getFullYear();
  const copyrightNotice = `© ${copyrightYear} ${brandName(locale)}. ${kn.rights}`;
  const eventPlace = localizePlace(
    await getPlaceNames(),
    locale,
    p.event_place,
  );
  const commentSettings = commentSettingsSchema
    .catch(defaultComments)
    .parse((await getSetting("comments")) || defaultComments);
  const author = (await getV4Rows("authors")).find(
    (a) => a.id === p.public_author_id,
  );
  const corrections = (await getV4Rows("corrections_log")).filter(
    (row) => row.post_id === p.id,
  );
  const episodes = await getV4Rows("series_items");
  const inSeries = episodes.find((row) => row.post_id === p.id);
  const series = inSeries
    ? (await getV4Rows("series")).find((row) => row.id === inSeries.series_id)
    : null;
  const awaitPostTagIds = new Set(
    (await getV4Rows("post_tags"))
      .filter((link) => link.post_id === p.id)
      .map((link) => link.tag_id),
  );
  const allPosts = await getPosts();
  const related = allPosts
    .filter(
      (x) =>
        x.id !== p.id &&
        x.category_slugs.some((c) => p.category_slugs.includes(c)),
    )
    .slice(0, 4);
  return (
    <div className="container page-shell">
      <ArticlePulse postId={p.id} demo={p.is_seed} />
      <div className="breadcrumb">
        <Link href="/">{kn.home}</Link>
        <span>/</span>
        <Link href="/category/news">{kn.news}</Link>
      </div>
      <AdSlot disabled={p.hide_ads} placement={`${p.type}-top`} />
      <div className="article-layout">
        <article>
          <div className="article-header">
            <span className="eyebrow">
              {eventPlace} · {p.type === "article" ? kn.news : kn.videoLabel}
            </span>
            <h1 lang={articleLanguage}>{p.title_kn}</h1>
            {hasEnglish && (
              <Link
                className="chip"
                href={postHref(p) + (english ? "?lang=kn" : "?lang=en")}
              >
                {english ? kn.readInKannada : kn.readInEnglish}
              </Link>
            )}
            {hasHindi && (
              <Link
                className="chip"
                href={postHref(p) + (hindi ? "?lang=kn" : "?lang=hi")}
              >
                {hindi ? kn.readInKannada : kn.readInHindi}
              </Link>
            )}
            {articleLanguage !== "kn" &&
              (original.machine_translated?.["title_" + articleLanguage] ||
                original.machine_translated?.["body_" + articleLanguage]) && (
                <p className="notice">{kn.machineTranslated}</p>
              )}
            {p.sponsor_name && (
              <p className="notice">
                {kn.sponsoredContent} · {p.sponsor_name}
              </p>
            )}
            {author && (
              <Link className="byline" href={"/author/" + author.slug}>
                {pickText(
                  locale,
                  author.name_kn,
                  author.name_en,
                  author.name_hi,
                )}{" "}
                ·{" "}
                {pickText(
                  locale,
                  author.role_kn,
                  author.role_en,
                  author.role_hi,
                )}
              </Link>
            )}
            {p.meaningful_update_at && (
              <p className="meta">
                {t.updated}: {formatDate(p.meaningful_update_at, false, locale)}
              </p>
            )}
            <p className="article-summary">{p.summary_kn}</p>
            <div className="article-dates">
              <span>
                {kn.eventDate}: <EventDateBadge date={p.event_date} />
              </span>
              <span>
                {kn.published}:{" "}
                <time dateTime={p.published_at}>
                  {formatDate(p.published_at, false, locale)}
                </time>
              </span>
            </div>
          </div>
          {p.media_images?.length ? (
            <div className={"article-collage count-" + p.media_images.length}>
              {p.media_images.map((image, i) => (
                <figure key={i}>
                  <div>
                    <Image
                      src={image.url}
                      alt={p.title_kn}
                      fill
                      sizes="(max-width:640px) 100vw,400px"
                    />
                  </div>
                  <figcaption>{image.credit}</figcaption>
                </figure>
              ))}
            </div>
          ) : p.type === "article" ? (
            <div className="article-image">
              <Image
                src={p.thumbnail_url}
                alt={p.title_kn}
                fill
                priority
                sizes="(max-width:900px) 100vw,800px"
              />
            </div>
          ) : (
            <LiteVideoEmbed
              postId={p.id}
              keyPoints={p.key_points}
              url={p.video_url}
              thumbnail={p.thumbnail_url}
              title={p.title_kn}
            />
          )}
          <div className="article-actions">
            <ShareButtons title={p.title_kn} summary={p.summary_kn} />
            <BookmarkButton postId={p.id} href={postHref(p)} />
          </div>
          <Reactions postId={p.id} demo={p.is_seed} />
          {!english && !hindi && (
            <ArticleAudio postId={p.id} title={p.title_kn} href={postHref(p)} />
          )}
          <ReadingTools postId={p.id} title={p.title_kn} href={postHref(p)} />
          {p.image_credit && (
            <p className="meta">
              {t.credit}: {p.image_credit}
            </p>
          )}
          {!!p.summary_points?.length && (
            <section className="key-facts">
              <h2>{t.keyFacts}</h2>
              <ul>
                {p.summary_points.map((point, i) => (
                  <li key={i}>{point}</li>
                ))}
              </ul>
            </section>
          )}
          {p.is_seed && <p className="notice">{kn.demoArticle}</p>}
          <ArticleBody
            language={articleLanguage}
            html={p.body_html}
            hideAds={p.hide_ads}
            sponsored={!!p.sponsor_name}
          />
          <p className="article-copyright">
            © {copyrightYear} {brandName(locale)}. {kn.articleCopyright}
          </p>
          <AdSlot disabled={p.hide_ads} placement={`${p.type}-after-content`} />
          <div className="category-chips">
            {(await getV4Rows("tags"))
              .filter((tag) => awaitPostTagIds.has(tag.id))
              .map((tag) => (
                <Link className="chip" href={"/tag/" + tag.slug} key={tag.id}>
                  #{pickText(locale, tag.name_kn, tag.name_en, tag.name_hi)}
                </Link>
              ))}
          </div>
          {corrections.map((row) => (
            <aside className="notice" key={row.id}>
              <strong>
                {t.corrections} · {formatDate(row.created_at, false, locale)}
              </strong>
              <p>{pickText(locale, row.note_kn, row.note_en, row.note_hi)}</p>
            </aside>
          ))}
          <PreferredSource />
          {series && (
            <section className="utility-panel">
              <h2>
                <Link href={"/series/" + series.slug}>
                  {pickText(
                    locale,
                    series.title_kn,
                    series.title_en,
                    series.title_hi,
                  )}
                </Link>
              </h2>
              {episodes
                .filter((e) => e.series_id === series.id)
                .sort((a, b) => a.episode_no - b.episode_no)
                .map((e) => {
                  const post = allPosts.find((row) => row.id === e.post_id);
                  return (
                    post && (
                      <Link
                        className="directory-link"
                        key={e.post_id}
                        href={postHref(post)}
                        aria-current={post.id === p.id ? "page" : undefined}
                      >
                        {e.episode_no}.{" "}
                        {pickText(
                          locale,
                          post.title_kn,
                          post.title_en,
                          post.title_hi,
                        )}
                      </Link>
                    )
                  );
                })}
            </section>
          )}
          {commentSettings.enabled && p.allow_comments && !p.is_seed && (
            <Comments postId={p.id} />
          )}
          <div className="event-detail">
            <h2>{kn.eventDetails}</h2>
            <dl>
              <dt>{kn.eventDate}</dt>
              <dd>{formatDate(p.event_date, false, locale)}</dd>
              <dt>{kn.place}</dt>
              <dd>{eventPlace}</dd>
            </dl>
          </div>
        </article>
        <aside>
          <AdSlot
            disabled={p.hide_ads}
            placement={`${p.type}-sidebar`}
            format="rectangle"
          />
          <SectionTitle>{kn.related}</SectionTitle>
          {related.map((p) => (
            <NewsCard key={p.id} post={p} compact />
          ))}
        </aside>
      </div>
      <section className="section">
        <SectionTitle>{kn.related}</SectionTitle>
        <div className="news-grid">
          {related.slice(0, 3).map((p) => (
            <NewsCard key={p.id} post={p} />
          ))}
        </div>
      </section>
      <AdSlot disabled={p.hide_ads} placement={`${p.type}-bottom`} />
      {!p.is_seed && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": p.type === "article" ? "NewsArticle" : "VideoObject",
              ...(p.type !== "article"
                ? {
                    name: pickText(locale, p.title_kn, p.title_en, p.title_hi),
                    description: pickText(
                      locale,
                      p.summary_kn,
                      p.summary_en,
                      p.summary_hi,
                    ),
                    uploadDate: p.published_at,
                    thumbnailUrl: new URL(p.thumbnail_url, site.url).href,
                    ...(p.video_url ? { contentUrl: p.video_url } : {}),
                    ...(p.duration_seconds
                      ? { duration: "PT" + p.duration_seconds + "S" }
                      : {}),
                  }
                : {}),
              headline: pickText(locale, p.title_kn, p.title_en, p.title_hi),
              inLanguage: articleLanguage,
              datePublished: p.published_at,
              dateModified: p.meaningful_update_at || p.published_at,
              mainEntityOfPage:
                site.url +
                postHref(p) +
                (english ? "?lang=en" : hindi ? "?lang=hi" : ""),
              publisher: {
                "@type": "Organization",
                name: brandName(locale),
                logo: { "@type": "ImageObject", url: site.url + site.logo },
              },
              image: {
                "@type": "ImageObject",
                url: new URL(p.thumbnail_url, site.url).href,
                creditText: p.image_credit || brandName(locale),
                copyrightNotice,
                license: site.url + "/terms",
                acquireLicensePage: site.url + "/contact",
              },
              copyrightHolder: {
                "@type": "Organization",
                name: brandName(locale),
                url: site.url,
              },
              copyrightYear,
              copyrightNotice,
              license: site.url + "/terms",
              isAccessibleForFree: true,
              author: author
                ? {
                    "@type": "Person",
                    name: pickText(
                      locale,
                      author.name_kn,
                      author.name_en,
                      author.name_hi,
                    ),
                    url: site.url + "/author/" + author.slug,
                  }
                : { "@type": "Organization", name: brandName(locale) },
            }).replace(/</g, "\\u003c"),
          }}
        />
      )}
    </div>
  );
}
