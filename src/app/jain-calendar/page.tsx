import { getUiStrings } from "@/lib/i18n/server";
import { getV4Rows } from "@/lib/v4/queries";
import { isoToday } from "@/lib/utils/dates";
import { JainTimesPanel } from "@/components/widgets/JainTimesPanel";
import { LazyJainCalendar as JainCalendar } from "@/components/ui/LazyComponents";
import { PlacePicker } from "@/components/widgets/PlacePicker";
import { SampleNotice } from "@/components/ui/Primitives";
import { AdSlot } from "@/components/ads/AdSlot";
import { site } from "@/config/site";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.jainCalendar };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const { v4: t } = await getUiStrings();

  const [days, places] = await Promise.all([
    getV4Rows("jain_calendar_days"),
    getV4Rows("places"),
  ]);
  const choice = (await searchParams).place,
    place =
      places.find((p) => p.slug === choice) ||
      places.find((p) => p.slug === "bengaluru-urban");
  return (
    <div className="container page-shell">
      {(site.demo || days.some((day) => day.is_seed)) && <SampleNotice />}
      <h1>{t.jainCalendar}</h1>
      {place && (
        <>
          <PlacePicker
            path="/jain-calendar"
            places={places}
            selected={place.slug}
          />
          <JainTimesPanel placeSlug={place.slug} />
        </>
      )}
      <AdSlot placement="jain-calendar-top" />
      <JainCalendar days={days} initialMonth={isoToday().slice(0, 7)} />
      <AdSlot placement="jain-calendar-bottom" />
    </div>
  );
}
