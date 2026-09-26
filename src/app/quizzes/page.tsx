import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { getV4Rows } from "@/lib/v4/queries";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.quizzes };
}
export default async function Page() {
  const { v4: t, kn, locale } = await getUiStrings();

  const quizzes = await getV4Rows("quizzes");
  return (
    <div className="container page-shell">
      <h1>{t.quizzes}</h1>
      <AdSlot placement="quizzes-top" />
      <div className="community-grid">
        {quizzes
          .filter((q) => q.status === "published")
          .map((q) => (
            <Link
              className="utility-panel"
              href={"/quizzes/" + q.slug}
              key={q.id}
            >
              <h2>{pickText(locale, q.title_kn, q.title_en, q.title_hi)}</h2>
              <p>
                {q.questions.length} {t.questions}
              </p>
            </Link>
          ))}
      </div>
      {!quizzes.length && <p>{kn.noResults}</p>}
    </div>
  );
}
