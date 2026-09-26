import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OpenWeatherProvider } from "@/lib/weather/openweather";

// 2026-09-26T06:00:00Z, so IST dates and the "future only" filter are stable.
const NOW = Date.UTC(2026, 8, 26, 6, 0, 0);
const hours = (n: number) => Math.floor(NOW / 1000) + n * 3600;

const current = {
  main: { temp: 27.4, feels_like: 29.1, humidity: 62 },
  // 5 m/s is 18 km/h; the UI labels this field km/h.
  wind: { speed: 5 },
  weather: [{ id: 501 }],
};

const forecast = {
  list: [
    { dt: hours(1), main: { temp: 28, temp_min: 27, temp_max: 29 }, pop: 0.2 },
    { dt: hours(4), main: { temp: 31, temp_min: 30, temp_max: 32 }, pop: 0.8 },
    { dt: hours(7), main: { temp: 25, temp_min: 24, temp_max: 26 }, pop: 0 },
  ],
};

const air = {
  list: Array.from({ length: 24 }, (_, i) => ({
    dt: hours(-i - 1),
    components: { pm2_5: 40, pm10: 80, no2: 20, so2: 10 },
  })),
};

function stubFetch() {
  return vi.fn(async (url: string | URL) => {
    const href = String(url);
    const body = href.includes("air_pollution")
      ? air
      : href.includes("forecast")
        ? forecast
        : current;
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe("OpenWeatherProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.OPENWEATHER_API_KEY = "test-key";
    globalThis.fetch = stubFetch() as unknown as typeof fetch;
  });
  afterEach(() => {
    vi.useRealTimers();
    delete process.env.OPENWEATHER_API_KEY;
  });

  it("refuses to run without a key", async () => {
    delete process.env.OPENWEATHER_API_KEY;
    await expect(
      new OpenWeatherProvider().fetch(12.9, 77.6, "p1"),
    ).rejects.toThrow(/OPENWEATHER_API_KEY/);
  });

  it("converts wind from m/s to the km/h the UI claims", async () => {
    const { weather } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    expect(weather.current.wind).toBeCloseTo(18, 5);
  });

  it("maps the condition id onto a WMO code weatherLabels carries", async () => {
    const { weather } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    // 501 "moderate rain" -> 63, which exists in weatherLabels.
    expect(weather.current.code).toBe(63);
  });

  it("expands the 3-hourly forecast so consumers get true hourly steps", async () => {
    const { weather } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    const times = weather.hourly.map((h) => Date.parse(h.time));
    expect(times.length).toBeGreaterThan(3);
    for (let i = 1; i < times.length; i++)
      expect(times[i] - times[i - 1]).toBe(3600000);
    // Temperature interpolates between slots; probability does not.
    expect(weather.hourly[0].temperature).toBeCloseTo(28, 5);
    expect(weather.hourly[1].temperature).toBeCloseTo(29, 5);
    expect(weather.hourly[0].rain).toBe(20);
    expect(weather.hourly[1].rain).toBe(20);
  });

  it("never returns an hourly entry in the past", async () => {
    const { weather } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    for (const hour of weather.hourly)
      expect(Date.parse(hour.time)).toBeGreaterThanOrEqual(NOW);
  });

  it("aggregates daily min, max and worst rain chance per IST date", async () => {
    const { weather } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    const day = weather.daily.find((d) => d.date === "2026-09-26");
    expect(day).toMatchObject({ min: 24, max: 32, rain: 80 });
  });

  it("averages air quality over the 24h window and scores it", async () => {
    const { aqi } = await new OpenWeatherProvider().fetch(12.9, 77.6, "p1");
    expect(aqi.pollutants).toMatchObject({ pm25: 40, pm10: 80 });
    // pm10 of 80 is the worst sub-index here, landing mid "satisfactory".
    expect(aqi.naqi).toBeGreaterThan(50);
    expect(aqi.provider).toBe("OpenWeather Air Pollution");
  });

  it("fails loudly when an endpoint errors rather than storing junk", async () => {
    globalThis.fetch = vi.fn(
      async () => new Response("nope", { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(
      new OpenWeatherProvider().fetch(12.9, 77.6, "p1"),
    ).rejects.toThrow(/unavailable/);
  });
});
