import type { HomeConfig } from "@/lib/v4/home";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import Link from "next/link";
import { getV4Rows } from "@/lib/v4/queries";
import { getFeedData } from "@/lib/v4/feed";
import { getPosts } from "@/lib/queries/content";
import { MyFeed } from "@/components/engagement/MyFeed";
import { NewsCard } from "@/components/news/NewsCard";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { isoToday } from "@/lib/utils/dates";
export async function HomeExtras({ config }: { config: HomeConfig }) {
  const { kn, v4: t, locale } = await getUiStrings();
  const [stories, galleries, days, feed, posts] = await Promise.all([
    getV4Rows("web_stories"),
    getV4Rows("galleries"),
    getV4Rows("jain_calendar_days"),
    getFeedData(),
    getPosts(),
  ]);
  const today = isoToday();
  const parva = days
    .filter((d) => d.date >= today && ["parva", "festival"].includes(d.kind))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);
  const anniversaries = posts.filter(
    (p) =>
      p.event_date.slice(5) === today.slice(5) &&
      p.event_date.slice(0, 4) < today.slice(0, 4),
  );
  const photo = (
    galleries.find((g) => g.id === config.photo_gallery_id) ||
    galleries.find((g) => g.images.length)
  )?.images[0];
  const photoCaption = photo
    ? pickText(locale, photo.caption, photo.caption_en, photo.caption_hi)
    : "";
  return (
    <>
      {config.extras.feed && (
        <section className="section">
          <h2>{t.feed}</h2>
          <MyFeed {...feed} />
        </section>
      )}
      {config.extras.stories && stories.length > 0 && (
        <section className="section">
          <h2>{t.stories}</h2>
          <div className="community-grid">
            {stories.slice(0, 4).map((s) => (
              <Link
                className="community-card"
                href={"/stories/" + s.slug}
                key={s.id}
              >
                <h3>{pickText(locale, s.title_kn, s.title_en, s.title_hi)}</h3>
                {s.slides[0] && (
                  <Image
                    src={s.slides[0].image}
                    alt=""
                    width={320}
                    height={430}
                    style={{ height: 240, width: "100%", objectFit: "cover" }}
                  />
                )}
              </Link>
            ))}
          </div>
        </section>
      )}
      {config.extras.photo && photo && (
        <section className="section">
          <h2>{kn.featuredPhoto}</h2>
          <figure>
            <Image
              src={photo.url}
              alt={photoCaption}
              width={1000}
              height={650}
              style={{ width: "100%", maxHeight: 420, objectFit: "cover" }}
            />
            <figcaption>
              {photoCaption} · {photo.credit}
            </figcaption>
          </figure>
          <Link href="/gallery" className="chip">
            {t.gallery}
          </Link>
        </section>
      )}
      {config.extras.parva && parva.length > 0 && (
        <section className="utility-panel">
          <h2>{t.jainCalendar}</h2>
          {parva.map((d) => (
            <Link className="directory-link" href="/jain-calendar" key={d.id}>
              {d.date} · {pickText(locale, d.title_kn, d.title_en, d.title_hi)}
              {d.is_seed ? " · " + t.sample : ""}
            </Link>
          ))}
        </section>
      )}
      {config.extras.history && anniversaries.length > 0 && (
        <section className="section">
          <h2>{kn.onThisDay}</h2>
          <div className="news-grid">
            {anniversaries.slice(0, 3).map((p) => (
              <NewsCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
