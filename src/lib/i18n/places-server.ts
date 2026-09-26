import "server-only";
import { cache } from "react";
import { getV4Rows } from "@/lib/v4/queries";
import type { PlaceNameMap } from "./places";

/**
 * Read once per request and shared by the layout and the article pages. A
 * failure here must not take the site down, since the venue text it decorates
 * is already readable on its own.
 */
export const getPlaceNames = cache(async (): Promise<PlaceNameMap> => {
  try {
    const places = await getV4Rows("places");
    const names: PlaceNameMap = {};
    for (const place of places)
      if (place.name_en || place.name_hi)
        names[place.name_kn] = { en: place.name_en, hi: place.name_hi };
    return names;
  } catch {
    return {};
  }
});
