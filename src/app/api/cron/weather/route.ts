import { timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { reserveBudget } from "@/lib/providers/budget";
import { OpenMeteoProvider } from "@/lib/weather/open-meteo";
import { privateJson } from "@/lib/v4/server";
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET,
    value = request.headers.get("authorization") || "";
  if (
    !secret ||
    Buffer.byteLength(value) !== Buffer.byteLength("Bearer " + secret) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from("Bearer " + secret))
  )
    return privateJson({ error: "unauthorized" }, 401);
  const db = getAdminClient();
  if (!db) return privateJson({ error: "unavailable" }, 503);
  const { data: places, error } = await db
    .from("places")
    .select("id,lat,lng")
    .eq("show_in_weather", true)
    .not("lat", "is", null)
    .not("lng", "is", null)
    .limit(100);
  if (error) return privateJson({ error: "unavailable" }, 503);
  let updated = 0,
    failed = 0;
  for (const place of places || []) {
    try {
      const { data: cached } = await db
        .from("weather_snapshots")
        .select("fetched_at")
        .eq("place_id", place.id)
        .maybeSingle();
      if (cached && Date.now() - Date.parse(cached.fetched_at) < 1800000)
        continue;
      await reserveBudget("weather", 2);
      const snapshot = await new OpenMeteoProvider().fetch(
        place.lat,
        place.lng,
        place.id,
      );
      const result = await db.rpc("save_weather_snapshot", {
        weather: snapshot.weather,
        air: snapshot.aqi,
      });
      if (result.error) throw result.error;
      updated++;
    } catch {
      failed++;
    }
  }
  return privateJson({ updated, failed }, failed ? 207 : 200);
}
