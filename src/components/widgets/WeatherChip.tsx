import { cookies } from "next/headers";
import Link from "next/link";
import { CloudSun } from "lucide-react";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getV4Rows } from "@/lib/v4/queries";
import { getWeather } from "@/lib/weather/queries";
import { PlacePicker } from "./PlacePicker";
import type { Place } from "@/lib/v4/types";
export async function WeatherChip() {
  const { v4: t, locale } = await getUiStrings();
  const places = await getV4Rows("places");
  const saved = (await cookies()).get("jwalamala-place")?.value;
  const place =
    places.find((p) => p.slug === saved) ||
    places.find((p) => p.slug === "bengaluru-urban");
  // The picker runs in the browser; send only what it uses for 278 places.
  const pickerPlaces = places.map(
    (p) =>
      ({
        id: p.id,
        slug: p.slug,
        name_kn: p.name_kn,
        name_en: p.name_en,
        name_hi: p.name_hi,
        lat: p.lat,
        lng: p.lng,
      }) as Place,
  );
  const { weather, stale } = place
    ? await getWeather(place.id, place.lat, place.lng)
    : { weather: null, stale: false };
  return (
    <details className="weather-menu" data-motion="off">
      <summary className="weather-chip" aria-label={t.weather}>
        <CloudSun size={19} />
        <span>
          {weather?.current.temperature != null
            ? Math.round(weather.current.temperature) + "°"
            : t.weather}
        </span>
      </summary>
      <div className="weather-popover">
        <strong>
          {place &&
            pickText(locale, place.name_kn, place.name_en, place.name_hi)}
        </strong>
        <p>
          {weather?.current.temperature != null
            ? Math.round(weather.current.temperature) + " °C"
            : t.noWeather}
          {stale ? " · " + t.stale : ""}
        </p>
        {place && <PlacePicker places={pickerPlaces} selected={place.slug} />}
        <Link className="chip" href={"/weather?place=" + (place?.slug || "")}>
          {t.forecast}
        </Link>
      </div>
    </details>
  );
}
