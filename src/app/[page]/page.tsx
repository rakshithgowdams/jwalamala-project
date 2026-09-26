import { getUiStrings } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { pages } from "@/content/pages.kn";
import { staticPages } from "@/lib/i18n/pages";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { locale, kn } = await getUiStrings();
  const { page } = await params;
  return {
    title: staticPages(locale)[page]?.title || kn.notFound,
    // One URL serves every language off the reader's cookie, so there is no
    // per-language href to advertise the way an article's ?lang= variants do.
    alternates: { canonical: "/" + page },
  };
}
export default async function StaticPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { locale, kn } = await getUiStrings();

  const key = (await params).page;
  // The Kannada table decides which pages exist; translations only supply text.
  if (!Object.hasOwn(pages, key)) notFound();
  const p = staticPages(locale)[key];
  if (!p) notFound();
  return (
    <div className="container page-shell text-page">
      <h1>{p.title}</h1>
      {p.paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
      <Link href="/contact" className="button button-ember">
        {kn.contact}
      </Link>
    </div>
  );
}
