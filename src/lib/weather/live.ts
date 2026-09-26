import "server-only";
import { unstable_cache } from "next/cache";
import { OpenWeatherProvider } from "./openweather";
import type { WeatherResult } from "./types";

// Matches the freshness window the weather cron enforces, so a reader served
// through this path never sees data older than the cron would have written.
const REVALIDATE = 1800;

export const getLiveWeather = unstable_cache(
  async (
    placeId: string,
    lat: number | null,
    lng: number | null,
  ): Promise<WeatherResult> => {
    if (lat === null || lng === null || !process.env.OPENWEATHER_API_KEY)
      return { weather: null, aqi: null, stale: false };
    try {
      const snapshot = await new OpenWeatherProvider().fetch(lat, lng, placeId);
      return { ...snapshot, stale: false };
    } catch {
      // A provider outage should leave the page rendering without weather
      // rather than fail the whole request.
      return { weather: null, aqi: null, stale: false };
    }
  },
  ["weather-live"],
  { revalidate: REVALIDATE, tags: ["weather"] },
);
