import type { Place } from "@/lib/v4/types";
import type { Post } from "@/lib/types";
import type { Locale } from "@/lib/i18n/strings";
import { pickText } from "@/lib/i18n/content";
import { placeState, resolvePlace } from "./geography";

export const DISTRICT_STATE = "Karnataka";

export const districtName = (locale: Locale, place: Place) =>
  pickText(locale, place.name_kn, place.name_en, place.name_hi);

/** Editor order first; districts sharing a position fall back to their name in the reader's language. */
export function listDistricts(
  places: Place[],
  locale: Locale,
  { includeHidden = false } = {},
) {
  return places
    .filter(
      (place) =>
        place.is_district &&
        placeState(place) === DISTRICT_STATE &&
        (includeHidden || place.show_in_district_news !== false),
    )
    .sort(
      (a, b) =>
        (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
        districtName(locale, a).localeCompare(districtName(locale, b), locale),
    );
}

/** A post belongs to the district of its saved place, so a town's news counts toward its district. */
export function postsInDistrict(
  posts: Post[],
  places: Place[],
  district: Place,
) {
  return posts.filter((post) => {
    const place = resolvePlace(places, post.place_id, post.event_place);
    return (
      !!place &&
      placeState(place) === placeState(district) &&
      place.district === district.district
    );
  });
}

export const townsInDistrict = (places: Place[], district: Place) =>
  places.filter(
    (place) =>
      !place.is_district &&
      placeState(place) === placeState(district) &&
      place.district === district.district,
  );
