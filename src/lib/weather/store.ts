import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
import { reserveBudget } from "@/lib/providers/budget";
import { OpenWeatherProvider } from "./openweather";
import type { WeatherProvider } from "./types";

/** Below this age a stored snapshot is served without contacting the provider. */
export const FRESH_MS = 1800000;

/**
 * Whether a stored snapshot can be served as it is, served while a refresh runs
 * behind the response, or is missing and has to be fetched before replying.
 */
export function refreshPlan(
  fetchedAt: string | null | undefined,
  now: number,
): "fresh" | "revalidate" | "fetch" {
  if (!fetchedAt) return "fetch";
  const age = now - Date.parse(fetchedAt);
  if (!Number.isFinite(age)) return "fetch";
  return age < FRESH_MS ? "fresh" : "revalidate";
}

/** Writing snapshots needs the service key; without it there is no shared cache. */
export function canPersist() {
  return getAdminClient() !== null;
}

const pending = new Map<string, Promise<Awaited<ReturnType<typeof write>>>>();

async function write(
  placeId: string,
  lat: number,
  lng: number,
  provider: WeatherProvider,
) {
  // Every provider call passes the budget gate, so a disabled or exhausted
  // provider stops spending requests instead of being retried for each reader.
  const db = await reserveBudget("weather", 3);
  const snapshot = await provider.fetch(lat, lng, placeId);
  const { error } = await db.rpc("save_weather_snapshot", {
    weather: snapshot.weather,
    air: snapshot.aqi,
  });
  if (error) throw error;
  return snapshot;
}

/**
 * Fetches a place and stores it, collapsing concurrent callers onto one request
 * so a burst of readers costs a single provider call rather than one each.
 */
export function refreshSnapshot(
  placeId: string,
  lat: number,
  lng: number,
  provider: WeatherProvider = new OpenWeatherProvider(),
) {
  const existing = pending.get(placeId);
  if (existing) return existing;
  const run = write(placeId, lat, lng, provider).finally(() =>
    pending.delete(placeId),
  );
  pending.set(placeId, run);
  return run;
}
