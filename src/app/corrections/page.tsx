import { getUiStrings } from "@/lib/i18n/server";
import { pickText, intlLocale } from "@/lib/i18n/content";
import Link from "next/link";
import { getV4Rows } from "@/lib/v4/queries";
import { getPosts } from "@/lib/queries/content";
import { postHref } from "@/lib/utils/post-href";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.corrections };
}
export default async function Page() {
  const { v4: t, locale } = await getUiStrings();
  const [rows, posts] = await Promise.all([
    getV4Rows("corrections_log"),
    getPosts(),
  ]);
  return (
    <div className="container page-shell text-page">
      <h1>{t.corrections}</h1>
      <p>{t.correctionsIntro}</p>
      {rows.length ? (
        rows
          .sort((a, b) => b.created_at.localeCompare(a.created_at))
          .map((row) => {
            const post = posts.find((p) => p.id === row.post_id);
            return (
              <article key={row.id} className="utility-panel">
                <time>
                  {new Date(row.created_at).toLocaleDateString(
                    intlLocale(locale),
                    { timeZone: "Asia/Kolkata" },
                  )}
                </time>
                <p>{pickText(locale, row.note_kn, row.note_en, row.note_hi)}</p>
                {post && (
                  <Link href={postHref(post)}>
                    {pickText(
                      locale,
                      post.title_kn,
                      post.title_en,
                      post.title_hi,
                    )}
                  </Link>
                )}
              </article>
            );
          })
      ) : (
        <p>{t.noCorrections}</p>
      )}
    </div>
  );
}
