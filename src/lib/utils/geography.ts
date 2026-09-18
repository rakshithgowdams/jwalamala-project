import type { Place } from "@/lib/v4/types";

export type LocationFilters = {
  state?: string;
  district?: string;
  city?: string;
};
export const placeState = (place: Place) => place.state || "Karnataka";

/** Match a saved place, never guess a district from a substring in an article. */
export function matchesLocation(
  place: Place | undefined,
  filters: LocationFilters,
) {
  if (!filters.state && !filters.district && !filters.city) return true;
  if (!place) return false;
  return (
    (!filters.state || placeState(place) === filters.state) &&
    (!filters.district || place.district === filters.district) &&
    (!filters.city || (!place.is_district && place.slug === filters.city))
  );
}

export function resolvePlace(places: Place[], id?: string, name?: string) {
  if (id) return places.find((place) => place.id === id);
  const normalized = name?.normalize("NFKC").trim().toLocaleLowerCase();
  return [...places]
    .sort((a, b) => Number(!!a.is_district) - Number(!!b.is_district))
    .find((place) =>
      [place.name_kn, place.name_en, place.slug].some(
        (value) =>
          value?.normalize("NFKC").trim().toLocaleLowerCase() === normalized,
      ),
    );
}

export function locationOptions(places: Place[], state = "", district = "") {
  return {
    states: [...new Set(places.map(placeState))].sort(),
    districts: state
      ? [
          ...new Set(
            places
              .filter((p) => placeState(p) === state)
              .map((p) => p.district),
          ),
        ].sort()
      : [],
    cities:
      state && district
        ? places
            .filter(
              (p) =>
                !p.is_district &&
                placeState(p) === state &&
                p.district === district,
            )
            .sort((a, b) => a.name_kn.localeCompare(b.name_kn))
        : [],
  };
}
