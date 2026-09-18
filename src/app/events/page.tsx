import { LocationFilter } from "@/components/search/LocationFilter";
import type { Filters } from "@/lib/utils/search";
import { getV4Rows } from "@/lib/v4/queries";
import { matchesLocation, resolvePlace } from "@/lib/utils/geography";
import { getUiStrings } from "@/lib/i18n/server";
import { getEvents } from "@/lib/queries/content";
import { LazyEventCalendar as EventCalendar } from "@/components/ui/LazyComponents";
import { isoToday } from "@/lib/utils/dates";
export async function generateMetadata() {
  const { kn } = await getUiStrings();
  return {
    title: kn.events,
    alternates: { canonical: "/events" },
  };
}
export default async function Events({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const [events, places] = await Promise.all([
    getEvents(),
    getV4Rows("places"),
  ]);
  const filtered = events.filter((event) =>
    matchesLocation(resolvePlace(places, event.place_id, event.place), filters),
  );
  const { kn } = await getUiStrings();

  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{kn.calendar}</h1>
        <p>{kn.upcoming}</p>
      </div>
      <LocationFilter filters={filters} action="/events" />
      <EventCalendar events={filtered} initialMonth={isoToday().slice(0, 7)} />
    </div>
  );
}
