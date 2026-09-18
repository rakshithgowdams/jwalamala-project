import { getUiStrings } from "@/lib/i18n/server";
import Link from "next/link";
import { getV4Rows } from "@/lib/v4/queries";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.quizzes };
}
export default async function Page() {
  const { v4: t, kn } = await getUiStrings();

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
              <h2>{q.title_kn}</h2>
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
