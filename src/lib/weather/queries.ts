import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { cache } from "react";
import type { WeatherResult, WeatherSnapshot, AqiSnapshot } from "./types";
export const getWeather = cache(
  async (placeId: string): Promise<WeatherResult> => {
    if (site.demo) return { weather: null, aqi: null, stale: false };
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return { weather: null, aqi: null, stale: false };
    const db = createClient(url, key, {
      global: { fetch: supabaseFetch },
      auth: { persistSession: false },
    });
    const [weatherResult, aqiResult] = await Promise.all([
      db
        .from("weather_snapshots")
        .select("*")
        .eq("place_id", placeId)
        .maybeSingle(),
      db
        .from("aqi_snapshots")
        .select("*")
        .eq("place_id", placeId)
        .maybeSingle(),
    ]);
    const weather = weatherResult.error
        ? null
        : (weatherResult.data as WeatherSnapshot | null),
      aqi = aqiResult.error ? null : (aqiResult.data as AqiSnapshot | null);
    const stale =
      !!weather && Date.now() - Date.parse(weather.fetched_at) > 3600000;
    return { weather, aqi, stale };
  },
);

export const getWeatherGrid = cache(async (): Promise<WeatherSnapshot[]> => {
  if (site.demo) return [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const db = createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("weather_snapshots")
    .select("*")
    .limit(100);
  return error ? [] : (data as WeatherSnapshot[]);
});
