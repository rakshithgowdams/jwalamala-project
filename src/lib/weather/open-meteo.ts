import "server-only";
import { z } from "zod";
import { hourlyAverage, naqi } from "./aqi";
import type { WeatherProvider } from "./types";
const numbers = z.array(z.number().nullable());
const forecastSchema = z.object({
  current: z.object({
    temperature_2m: z.number().nullable(),
    apparent_temperature: z.number().nullable(),
    relative_humidity_2m: z.number().nullable(),
    wind_speed_10m: z.number().nullable(),
    weather_code: z.number().nullable(),
  }),
  hourly: z.object({
    time: z.array(z.number()),
    temperature_2m: numbers,
    precipitation_probability: numbers,
  }),
  daily: z.object({
    time: z.array(z.number()),
    temperature_2m_min: numbers,
    temperature_2m_max: numbers,
    precipitation_probability_max: numbers,
  }),
});
const airSchema = z.object({
  hourly: z.object({
    time: z.array(z.number()),
    pm2_5: numbers,
    pm10: numbers,
    nitrogen_dioxide: numbers,
    sulphur_dioxide: numbers,
  }),
});
export class OpenMeteoProvider implements WeatherProvider {
  async fetch(lat: number, lng: number, placeId: string) {
    const key = process.env.OPEN_METEO_API_KEY;
    const allowFree =
      process.env.NODE_ENV !== "production" &&
      process.env.WEATHER_ALLOW_NONCOMMERCIAL_DEV === "true";
    if (!key && !allowFree)
      throw new Error("Licensed weather provider configuration required");
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      timezone: "Asia/Kolkata",
      timeformat: "unixtime",
    });
    if (key) params.set("apikey", key);
    const weatherUrl = new URL(
      "https://" + (key ? "customer-" : "") + "api.open-meteo.com/v1/forecast",
    );
    weatherUrl.search = params.toString();
    weatherUrl.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code",
    );
    weatherUrl.searchParams.set(
      "hourly",
      "temperature_2m,precipitation_probability",
    );
    weatherUrl.searchParams.set(
      "daily",
      "temperature_2m_min,temperature_2m_max,precipitation_probability_max",
    );
    weatherUrl.searchParams.set("forecast_days", "7");
    const airUrl = new URL(
      "https://" +
        (key ? "customer-" : "") +
        "air-quality-api.open-meteo.com/v1/air-quality",
    );
    airUrl.search = params.toString();
    airUrl.searchParams.set(
      "hourly",
      "pm2_5,pm10,nitrogen_dioxide,sulphur_dioxide",
    );
    airUrl.searchParams.set("past_days", "1");
    airUrl.searchParams.set("forecast_days", "1");
    const [forecastResponse, airResponse] = await Promise.all([
      fetch(weatherUrl, { signal: AbortSignal.timeout(12000) }),
      fetch(airUrl, { signal: AbortSignal.timeout(12000) }),
    ]);
    if (!forecastResponse.ok || !airResponse.ok)
      throw new Error("Weather provider unavailable");
    const forecast = forecastSchema.parse(await forecastResponse.json()),
      air = airSchema.parse(await airResponse.json());
    const now = Date.now(),
      fetched_at = new Date(now).toISOString();
    const indexes = air.hourly.time
      .map((time, i) => ({ time: time * 1000, i }))
      .filter((row) => row.time <= now && row.time > now - 24 * 3600000)
      .map((row) => row.i);
    const average = (values: (number | null)[]) =>
      hourlyAverage(indexes.map((i) => values[i] ?? null));
    const pollutants = {
      pm25: average(air.hourly.pm2_5),
      pm10: average(air.hourly.pm10),
      no2: average(air.hourly.nitrogen_dioxide),
      so2: average(air.hourly.sulphur_dioxide),
    };
    return {
      weather: {
        place_id: placeId,
        fetched_at,
        provider: "Open-Meteo",
        current: {
          temperature: forecast.current.temperature_2m,
          feels_like: forecast.current.apparent_temperature,
          humidity: forecast.current.relative_humidity_2m,
          wind: forecast.current.wind_speed_10m,
          code: forecast.current.weather_code,
        },
        hourly: forecast.hourly.time
          .map((time, i) => ({
            time: new Date(time * 1000).toISOString(),
            temperature: forecast.hourly.temperature_2m[i] ?? null,
            rain: forecast.hourly.precipitation_probability[i] ?? null,
          }))
          .filter((row) => Date.parse(row.time) >= now)
          .slice(0, 24),
        daily: forecast.daily.time.map((time, i) => ({
          date: new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
          }).format(new Date(time * 1000)),
          min: forecast.daily.temperature_2m_min[i] ?? null,
          max: forecast.daily.temperature_2m_max[i] ?? null,
          rain: forecast.daily.precipitation_probability_max[i] ?? null,
        })),
      },
      aqi: {
        place_id: placeId,
        fetched_at,
        provider: "CAMS / Open-Meteo",
        pollutants,
        naqi: naqi(pollutants),
      },
    };
  }
}
