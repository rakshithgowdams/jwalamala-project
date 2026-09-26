import { cookies } from "next/headers";
import Link from "next/link";
import { getSetting } from "@/lib/v4/settings";
import { NewsCard } from "@/components/news/NewsCard";
import { getListing } from "@/lib/queries/listing";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getV4Rows } from "@/lib/v4/queries";
import { getWeather, getWeatherGrid } from "@/lib/weather/queries";
import { aqiCategory } from "@/lib/weather/aqi";
import { PlacePicker } from "@/components/widgets/PlacePicker";
import { JainTimesPanel } from "@/components/widgets/JainTimesPanel";
import { AdSlot } from "@/components/ads/AdSlot";
import { istTime } from "@/lib/jain/times";
import { formatDate } from "@/lib/utils/dates";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.weather };
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ place?: string }>;
}) {
  const { kn, v4: t, aqiLabels, weatherLabels, locale } = await getUiStrings();

  const places = await getV4Rows("places");
  const choice =
    (await searchParams).place ||
    (await cookies()).get("jwalamala-place")?.value;
  const place =
    places.find((place) => place.slug === choice) ||
    places.find((place) => place.slug === "bengaluru-urban") ||
    places[0];
  const { weather, aqi, stale } = place
    ? await getWeather(place.id, place.lat, place.lng)
    : { weather: null, aqi: null, stale: false };
  const grid = await getWeatherGrid();
  // Snapshots only exist once the cron has run, so the listed towns fall back to
  // the provider. Restricted to show_in_weather places to keep the number of
  // concurrent provider requests well inside the free tier's allowance.
  const tiles = await Promise.all(
    places
      .filter((p) => p.show_in_weather)
      .map(async (p) => ({
        place: p,
        snapshot:
          grid.find((row) => row.place_id === p.id) ??
          (await getWeather(p.id, p.lat, p.lng)).weather,
      })),
  );
  const settings = (await getSetting("weather_display")) as {
    rain_probability_threshold?: number;
  } | null;
  const threshold = Math.max(
    0,
    Math.min(
      100,
      typeof settings?.rain_probability_threshold === "number"
        ? settings.rain_probability_threshold
        : 70,
    ),
  );
  const rain = weather?.hourly
    .slice(0, 6)
    .some((h) => h.rain !== null && h.rain >= threshold);
  const related = place
    ? (await getListing({ place_id: place.id }, "1", 3)).rows
    : [];
  const level = aqiCategory(aqi?.naqi ?? null),
    show = (v: number | null | undefined) =>
      v === null || v === undefined ? "—" : Math.round(v);
  return (
    <div className="container page-shell">
      <div className="page-heading">
        <h1>{t.weather}</h1>
        <p>
          {place &&
            pickText(locale, place.name_kn, place.name_en, place.name_hi)}
        </p>
      </div>
      {place && <PlacePicker places={places} selected={place.slug} />}
      <AdSlot placement="weather-top" />
      <div className="ad-supported-layout">
        <section className="ad-supported-content">
          {weather ? (
            <>
              {rain && (
                <p className="notice">
                  {t.rain}: {threshold}%+ · {t.next6Hours}
                </p>
              )}
              <div className="weather-now">
                <strong>{show(weather.current.temperature)}°C</strong>
                <p>
                  {weatherLabels[String(weather.current.code)] || t.weather}
                </p>
                <span>
                  {t.updated}: {istTime(weather.fetched_at)}{" "}
                  {stale && " · " + t.stale}
                </span>
              </div>
              <div className="utility-grid">
                <div className="stat-tile">
                  <span>{t.feelsLike}</span>
                  <strong>{show(weather.current.feels_like)}°C</strong>
                </div>
                <div className="stat-tile">
                  <span>{t.humidity}</span>
                  <strong>{show(weather.current.humidity)}%</strong>
                </div>
                <div className="stat-tile">
                  <span>{t.wind}</span>
                  <strong>{show(weather.current.wind)}</strong>
                  <span>km/h</span>
                </div>
              </div>
              <section className="section">
                <h2>{t.hourly}</h2>
                <div className="horizontal-cards">
                  {weather.hourly.map((hour) => (
                    <div className="stat-tile" key={hour.time}>
                      <span>{istTime(hour.time)}</span>
                      <strong>{show(hour.temperature)}°</strong>
                      <span>
                        {t.rain}: {show(hour.rain)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              <section className="section">
                <h2>{t.forecast}</h2>
                <div className="horizontal-cards">
                  {weather.daily.map((day) => (
                    <div className="stat-tile" key={day.date}>
                      <span>{formatDate(day.date, true, locale)}</span>
                      <strong>
                        {show(day.min)}–{show(day.max)}°
                      </strong>
                      <span>
                        {t.rain}: {show(day.rain)}%
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : (
            <div className="utility-panel">
              <h2>{t.noWeather}</h2>
              <p>{t.weatherAvailability}</p>
            </div>
          )}
          <section className="utility-panel">
            <h2>
              {t.airQuality} · {t.estimated}
            </h2>
            {aqi && level !== null ? (
              <>
                <strong className={"aqi-value aqi-" + level}>
                  {aqi.naqi! > 400 ? ">400" : aqi.naqi} · {aqiLabels[level]}
                </strong>
                <div className="utility-grid">
                  {Object.entries(aqi.pollutants).map(([key, value]) => (
                    <div className="stat-tile" key={key}>
                      <span>{key.toUpperCase()} · µg/m³</span>
                      <strong>{show(value)}</strong>
                    </div>
                  ))}
                </div>
                <p className="meta">
                  {t.updated}: {istTime(aqi.fetched_at)}
                </p>
              </>
            ) : (
              <p>{t.dataUnavailable}</p>
            )}
            <p className="meta">{t.aqiNote}</p>
          </section>
          <p className="meta">
            {t.source}:{" "}
            <a
              href="https://openweathermap.org/"
              target="_blank"
              rel="noopener noreferrer"
            >
              OpenWeather
            </a>
          </p>
          {place && <JainTimesPanel placeSlug={place.slug} />}
        </section>
        <aside className="ad-sidebar">
          <AdSlot placement="weather-sidebar" format="rectangle" />
          <p>{kn.eventDate}</p>
        </aside>
      </div>
      <section className="section">
        <h2>{t.places}</h2>
        <div className="community-grid">
          {tiles.map(({ place: p, snapshot: w }) => (
            <Link
              className="community-card"
              key={p.id}
              href={"/weather?place=" + p.slug}
            >
              <strong>
                {pickText(locale, p.name_kn, p.name_en, p.name_hi)}
              </strong>
              <p>
                {w?.current.temperature != null
                  ? Math.round(w.current.temperature) + " °C"
                  : t.dataUnavailable}
              </p>
              {w && (
                <time className="meta" dateTime={w.fetched_at}>
                  {t.updated}: {istTime(w.fetched_at)}
                </time>
              )}
            </Link>
          ))}
        </div>
      </section>
      {related.length > 0 && (
        <section className="section">
          <h2>{kn.related}</h2>
          <div className="news-grid">
            {related.map((p) => (
              <NewsCard key={p.id} post={p} />
            ))}
          </div>
        </section>
      )}
      <AdSlot placement="weather-bottom" />
    </div>
  );
}
