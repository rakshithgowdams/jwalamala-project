import { getUiStrings } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { pages } from "@/content/pages.kn";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { kn } = await getUiStrings();
  const { page } = await params;
  return {
    title: pages[page]?.title || kn.notFound,
    alternates: { canonical: "/" + page },
  };
}
export default async function StaticPage({
  params,
}: {
  params: Promise<{ page: string }>;
}) {
  const { kn } = await getUiStrings();

  const key = (await params).page;
  if (!Object.hasOwn(pages, key)) notFound();
  const p = pages[key];
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
