import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { after } from "next/server";
import { cache } from "react";
import { getLiveWeather } from "./live";
import { canPersist, refreshPlan, refreshSnapshot } from "./store";
import type { WeatherResult, WeatherSnapshot, AqiSnapshot } from "./types";
function readOnlyClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false },
  });
}
export const getWeather = cache(
  async (
    placeId: string,
    lat: number | null = null,
    lng: number | null = null,
  ): Promise<WeatherResult> => {
    let cached: WeatherResult = { weather: null, aqi: null, stale: false };
    const db = site.demo ? null : readOnlyClient();
    if (db) {
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
      cached = { weather, aqi, stale };
    }
    if (lat === null || lng === null) return cached;
    const plan = refreshPlan(cached.weather?.fetched_at, Date.now());
    if (plan === "fresh") return cached;
    if (!canPersist()) {
      // No service key, so nothing can be written for other readers to share.
      const live = await getLiveWeather(placeId, lat, lng);
      return live.weather ? live : cached;
    }
    if (plan === "revalidate") {
      // Serve the stored copy now and refresh behind the response, so readers
      // never wait on the provider and one refresh serves all of them.
      schedule(() => refreshSnapshot(placeId, lat, lng));
      return cached;
    }
    try {
      return { ...(await refreshSnapshot(placeId, lat, lng)), stale: false };
    } catch {
      // Budget exhausted or the provider is down; the empty panel is honest.
      return cached;
    }
  },
);
/** `after` needs a request scope, which prerendering does not provide. */
function schedule(task: () => Promise<unknown>) {
  try {
    after(() => task().catch(() => {}));
  } catch {}
}

export const getWeatherGrid = cache(async (): Promise<WeatherSnapshot[]> => {
  const db = site.demo ? null : readOnlyClient();
  if (!db) return [];
  const { data, error } = await db
    .from("weather_snapshots")
    .select("*")
    .limit(100);
  return error ? [] : (data as WeatherSnapshot[]);
});
