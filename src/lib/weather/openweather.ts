import "server-only";
import { z } from "zod";
import { hourlyAverage, naqi } from "./aqi";
import type { WeatherProvider } from "./types";
const nullableNumber = z.number().nullable();
const conditions = z.array(z.object({ id: z.number() })).min(1);
const currentSchema = z.object({
  main: z.object({
    temp: nullableNumber,
    feels_like: nullableNumber,
    humidity: nullableNumber,
  }),
  wind: z.object({ speed: nullableNumber }).optional(),
  weather: conditions,
});
const forecastSchema = z.object({
  list: z
    .array(
      z.object({
        dt: z.number(),
        main: z.object({
          temp: nullableNumber,
          temp_min: nullableNumber,
          temp_max: nullableNumber,
        }),
        pop: nullableNumber.optional(),
      }),
    )
    .min(1),
});
const airSchema = z.object({
  list: z.array(
    z.object({
      dt: z.number(),
      components: z.object({
        pm2_5: nullableNumber,
        pm10: nullableNumber,
        no2: nullableNumber,
        so2: nullableNumber,
      }),
    }),
  ),
});
// OpenWeather condition ids mapped onto the WMO codes that weatherLabels is
// keyed by, so the existing trilingual labels keep working unchanged.
const wmo: Record<number, number> = {
  800: 0,
  801: 1,
  802: 2,
  803: 2,
  804: 3,
  300: 51,
  310: 51,
  321: 51,
  301: 53,
  311: 53,
  313: 53,
  302: 55,
  312: 55,
  314: 55,
  500: 61,
  501: 63,
  502: 65,
  503: 65,
  504: 65,
  511: 65,
  520: 80,
  521: 81,
  522: 82,
  531: 82,
  600: 71,
  611: 71,
  612: 71,
  613: 71,
  615: 71,
  620: 71,
  601: 73,
  616: 73,
  621: 73,
  602: 75,
  622: 75,
  701: 45,
  711: 45,
  721: 45,
  731: 45,
  751: 45,
  761: 45,
  762: 45,
  771: 45,
  741: 48,
  781: 95,
};
function weatherCode(id: number) {
  if (wmo[id] !== undefined) return wmo[id];
  // Fall back to the group so an id added later still lands on a real label.
  const group = Math.floor(id / 100);
  if (group === 2) return 95;
  if (group === 3) return 53;
  if (group === 5) return 63;
  if (group === 6) return 73;
  if (group === 7) return 45;
  return null;
}
const istDate = (ms: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(ms),
  );
const between = (from: number | null, to: number | null, ratio: number) =>
  from === null || to === null ? (from ?? to) : from + (to - from) * ratio;
export class OpenWeatherProvider implements WeatherProvider {
  async fetch(lat: number, lng: number, placeId: string) {
    const key = process.env.OPENWEATHER_API_KEY;
    if (!key) throw new Error("OPENWEATHER_API_KEY is not configured");
    const now = Date.now();
    const base = "https://api.openweathermap.org/data/2.5/";
    const common = `lat=${lat}&lon=${lng}&appid=${key}`;
    const end = Math.floor(now / 1000),
      start = end - 24 * 3600;
    const [currentResponse, forecastResponse, airResponse] = await Promise.all([
      fetch(`${base}weather?${common}&units=metric`, {
        signal: AbortSignal.timeout(12000),
      }),
      fetch(`${base}forecast?${common}&units=metric`, {
        signal: AbortSignal.timeout(12000),
      }),
      fetch(
        `${base}air_pollution/history?${common}&start=${start}&end=${end}`,
        {
          signal: AbortSignal.timeout(12000),
        },
      ),
    ]);
    if (!currentResponse.ok || !forecastResponse.ok || !airResponse.ok)
      throw new Error("Weather provider unavailable");
    const current = currentSchema.parse(await currentResponse.json()),
      forecast = forecastSchema.parse(await forecastResponse.json()),
      air = airSchema.parse(await airResponse.json());
    const fetched_at = new Date(now).toISOString();
    // The free forecast is 3-hourly. Consumers treat this list as hourly — the
    // weather page reads the first six entries as "the next six hours" — so the
    // slots are expanded rather than passed through at a coarser step.
    const slots = forecast.list
      .map((slot) => ({
        ms: slot.dt * 1000,
        temperature: slot.main.temp,
        rain:
          slot.pop === null || slot.pop === undefined ? null : slot.pop * 100,
      }))
      .sort((a, b) => a.ms - b.ms);
    const hourly: {
      time: string;
      temperature: number | null;
      rain: number | null;
    }[] = [];
    slots.forEach((slot, i) => {
      const next = slots[i + 1];
      const steps = next ? Math.round((next.ms - slot.ms) / 3600000) : 1;
      for (let step = 0; step < Math.max(1, steps); step++) {
        const time = slot.ms + step * 3600000;
        if (time < now) continue;
        hourly.push({
          time: new Date(time).toISOString(),
          temperature: next
            ? between(slot.temperature, next.temperature, step / steps)
            : slot.temperature,
          // Probability belongs to its slot; interpolating would invent values.
          rain: slot.rain,
        });
      }
    });
    const days = new Map<
      string,
      { min: number | null; max: number | null; rain: number | null }
    >();
    for (const slot of forecast.list) {
      const date = istDate(slot.dt * 1000);
      const day = days.get(date) || { min: null, max: null, rain: null };
      const low = slot.main.temp_min ?? slot.main.temp,
        high = slot.main.temp_max ?? slot.main.temp,
        pop =
          slot.pop === null || slot.pop === undefined ? null : slot.pop * 100;
      if (low !== null)
        day.min = day.min === null ? low : Math.min(day.min, low);
      if (high !== null)
        day.max = day.max === null ? high : Math.max(day.max, high);
      if (pop !== null)
        day.rain = day.rain === null ? pop : Math.max(day.rain, pop);
      days.set(date, day);
    }
    const window = air.list.filter(
      (row) => row.dt * 1000 <= now && row.dt * 1000 > now - 24 * 3600000,
    );
    const average = (pick: (row: (typeof window)[number]) => number | null) =>
      hourlyAverage(window.map(pick));
    const pollutants = {
      pm25: average((row) => row.components.pm2_5),
      pm10: average((row) => row.components.pm10),
      no2: average((row) => row.components.no2),
      so2: average((row) => row.components.so2),
    };
    return {
      weather: {
        place_id: placeId,
        fetched_at,
        provider: "OpenWeather",
        current: {
          temperature: current.main.temp,
          feels_like: current.main.feels_like,
          humidity: current.main.humidity,
          // metric units give m/s; the UI labels this value km/h.
          wind:
            current.wind?.speed === null || current.wind?.speed === undefined
              ? null
              : current.wind.speed * 3.6,
          code: weatherCode(current.weather[0].id),
        },
        hourly: hourly.slice(0, 24),
        daily: [...days.entries()].map(([date, day]) => ({ date, ...day })),
      },
      aqi: {
        place_id: placeId,
        fetched_at,
        provider: "OpenWeather Air Pollution",
        pollutants,
        naqi: naqi(pollutants),
      },
    };
  }
}
