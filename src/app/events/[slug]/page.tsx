import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { localizePlace } from "@/lib/i18n/places";
import { getPlaceNames } from "@/lib/i18n/places-server";
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
    title: e ? pickText(locale, e.name_kn, e.name_en, e.name_hi) : kn.notFound,
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
  const names = await getPlaceNames();
  const place = localizePlace(names, locale, e.place);
  return (
    <div className="container page-shell text-page">
      <div className="breadcrumb">
        <Link href="/events">{kn.events}</Link>
        <span>/</span>
        {place}
      </div>
      <h1>{pickText(locale, e.name_kn, e.name_en, e.name_hi)}</h1>
      <p>
        {pickText(locale, e.description_kn, e.description_en, e.description_hi)}
      </p>
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
            {place}, {localizePlace(names, locale, e.district)}
          </dd>
          <dt>{kn.organiser}</dt>
          <dd>
            {pickText(locale, e.organiser, e.organiser_en, e.organiser_hi)}
          </dd>
        </dl>
      </div>
      <div className="section">
        <ReminderButton eventId={e.id} />
      </div>
    </div>
  );
}
