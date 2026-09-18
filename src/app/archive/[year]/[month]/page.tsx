import { getUiStrings } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/queries/listing";
import { NewsCard } from "@/components/news/NewsCard";
import { EmptyState, SampleNotice } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";
import { site } from "@/config/site";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.archive };
}
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ year: string; month: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { kn, v4: t, months } = await getUiStrings();

  const { year, month } = await params;
  if (
    !/^\d{4}$/.test(year) ||
    !/^(0?[1-9]|1[0-2])$/.test(month) ||
    Number(year) < 1900 ||
    Number(year) > 2100
  )
    notFound();
  const prefix = year + "-" + month.padStart(2, "0");
  const last = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  const rows = await getListing(
    {
      mode: "event_date",
      from: prefix + "-01",
      to: prefix + "-" + String(last),
    },
    (await searchParams).page,
    9,
  );
  const nav = (delta: number) => {
    const d = new Date(Date.UTC(Number(year), Number(month) - 1 + delta, 1));
    return (
      "/archive/" +
      d.getUTCFullYear() +
      "/" +
      String(d.getUTCMonth() + 1).padStart(2, "0")
    );
  };
  return (
    <div className="container page-shell">
      {site.demo && <SampleNotice />}
      <div className="section-title">
        <Link className="chip" href={nav(-1)}>
          {kn.previous}
        </Link>
        <h1>
          {months[Number(month) - 1]} {year}
        </h1>
        <Link className="chip" href={nav(1)}>
          {kn.next}
        </Link>
      </div>
      <p>
        {kn.eventDate} · {t.archive}
      </p>
      <AdSlot placement="archive-top" />
      {rows.rows.length ? (
        <div className="news-grid">
          {rows.rows.map((post) => (
            <NewsCard post={post} key={post.id} />
          ))}
        </div>
      ) : (
        <EmptyState />
      )}
      <nav className="pagination">
        {Array.from({ length: rows.pages }, (_, i) => (
          <Link
            key={i}
            href={"?page=" + (i + 1)}
            className="chip"
            aria-current={rows.page === i + 1 ? "page" : undefined}
          >
            {i + 1}
          </Link>
        ))}
      </nav>
      <AdSlot placement="archive-bottom" />
    </div>
  );
}
