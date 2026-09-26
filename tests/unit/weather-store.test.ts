import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FRESH_MS, refreshPlan } from "@/lib/weather/store";

const now = Date.UTC(2026, 8, 26, 6, 0, 0);
const at = (msAgo: number) => new Date(now - msAgo).toISOString();

describe("refreshPlan", () => {
  it("serves a recent snapshot without contacting the provider", () => {
    expect(refreshPlan(at(0), now)).toBe("fresh");
    expect(refreshPlan(at(FRESH_MS - 1000), now)).toBe("fresh");
  });

  it("revalidates once the snapshot passes the freshness window", () => {
    expect(refreshPlan(at(FRESH_MS), now)).toBe("revalidate");
    expect(refreshPlan(at(FRESH_MS * 10), now)).toBe("revalidate");
  });

  it("fetches when nothing is stored or the timestamp is unusable", () => {
    expect(refreshPlan(null, now)).toBe("fetch");
    expect(refreshPlan(undefined, now)).toBe("fetch");
    expect(refreshPlan("not-a-date", now)).toBe("fetch");
  });
});

describe("refreshSnapshot", () => {
  const rpc = vi.fn();
  const provider = { fetch: vi.fn() };

  beforeEach(() => {
    vi.resetModules();
    rpc.mockReset().mockResolvedValue({ error: null });
    provider.fetch.mockReset();
    vi.doMock("@/lib/supabase/admin", () => ({
      getAdminClient: () => ({ rpc }),
    }));
    vi.doMock("@/lib/providers/budget", () => ({
      reserveBudget: vi.fn(async () => ({ rpc })),
    }));
  });

  afterEach(() => vi.doUnmock("@/lib/supabase/admin"));

  it("collapses concurrent readers of one place onto a single fetch", async () => {
    const { refreshSnapshot } = await import("@/lib/weather/store");
    // The gate is built before the calls, because the provider is only reached
    // after an await and a mock-local promise would not exist yet.
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    provider.fetch.mockImplementation(async () => {
      await gate;
      return {
        weather: { place_id: "p1", fetched_at: at(0) },
        aqi: { place_id: "p1", fetched_at: at(0) },
      };
    });
    const calls = [
      refreshSnapshot("p1", 12, 77, provider),
      refreshSnapshot("p1", 12, 77, provider),
      refreshSnapshot("p1", 12, 77, provider),
    ];
    release();
    await Promise.all(calls);
    // Three readers, one provider call and one write.
    expect(provider.fetch).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("stores the snapshot through the upserting rpc", async () => {
    const { refreshSnapshot } = await import("@/lib/weather/store");
    const weather = { place_id: "p2", fetched_at: at(0) };
    const aqi = { place_id: "p2", fetched_at: at(0) };
    provider.fetch.mockResolvedValue({ weather, aqi });
    await refreshSnapshot("p2", 12, 77, provider);
    expect(rpc).toHaveBeenCalledWith("save_weather_snapshot", {
      weather,
      air: aqi,
    });
  });

  it("lets a later reader retry after a failed fetch", async () => {
    const { refreshSnapshot } = await import("@/lib/weather/store");
    provider.fetch.mockRejectedValueOnce(new Error("provider down"));
    await expect(refreshSnapshot("p3", 12, 77, provider)).rejects.toThrow(
      /provider down/,
    );
    provider.fetch.mockResolvedValue({
      weather: { place_id: "p3", fetched_at: at(0) },
      aqi: { place_id: "p3", fetched_at: at(0) },
    });
    // The in-flight entry must be cleared, or the place could never refresh.
    await expect(refreshSnapshot("p3", 12, 77, provider)).resolves.toBeTruthy();
    expect(provider.fetch).toHaveBeenCalledTimes(2);
  });
});
