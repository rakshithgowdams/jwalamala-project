import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEvents } from "@/lib/queries/content";
import { formatDate } from "@/lib/utils/dates";
import { ReminderButton } from "@/components/news/PostActions";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn, locale } = await getUiStrings();
  const { slug } = await params;
  const e = (await getEvents()).find((e) => e.slug === slug);
  return {
    title: e ? pickText(locale, e.name_kn, e.name_en) : kn.notFound,
    alternates: { canonical: "/events/" + slug },
  };
}
export default async function Event({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { kn, locale } = await getUiStrings();

  const { slug } = await params;
  const e = (await getEvents()).find((e) => e.slug === slug);
  if (!e) notFound();
  return (
    <div className="container page-shell text-page">
      <div className="breadcrumb">
        <Link href="/events">{kn.events}</Link>
        <span>/</span>
        {e.place}
      </div>
      <h1>{pickText(locale, e.name_kn, e.name_en)}</h1>
      <p>{e.description_kn}</p>
      <div className="event-detail">
        <dl>
          <dt>{kn.dateRange}</dt>
          <dd>
            {formatDate(e.start_date, false, locale)}
            {e.end_date !== e.start_date &&
              " — " + formatDate(e.end_date, false, locale)}
          </dd>
          <dt>{kn.place}</dt>
          <dd>
            {e.place}, {e.district}
          </dd>
          <dt>{kn.organiser}</dt>
          <dd>{e.organiser}</dd>
        </dl>
      </div>
      <div className="section">
        <ReminderButton eventId={e.id} />
      </div>
    </div>
  );
}
