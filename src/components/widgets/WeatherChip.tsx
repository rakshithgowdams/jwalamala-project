import { cookies } from "next/headers";
import Link from "next/link";
import { CloudSun } from "lucide-react";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getV4Rows } from "@/lib/v4/queries";
import { getWeather } from "@/lib/weather/queries";
import { PlacePicker } from "./PlacePicker";
export async function WeatherChip() {
  const { v4: t, locale } = await getUiStrings();
  const places = await getV4Rows("places");
  const saved = (await cookies()).get("jwalamala-place")?.value;
  const place =
    places.find((p) => p.slug === saved) ||
    places.find((p) => p.slug === "bengaluru-urban");
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
        {place && <PlacePicker places={places} selected={place.slug} />}
        <Link className="chip" href={"/weather?place=" + (place?.slug || "")}>
          {t.forecast}
        </Link>
      </div>
    </details>
  );
}
