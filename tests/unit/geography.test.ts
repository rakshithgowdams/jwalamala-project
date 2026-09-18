import { describe, expect, it } from "vitest";
import {
  locationOptions,
  matchesLocation,
  resolvePlace,
} from "@/lib/utils/geography";
import { v4Demo } from "@/lib/v4/demo";
import type { Place } from "@/lib/v4/types";
const places: Place[] = [
  ...v4Demo.places,
  {
    id: "other-state-city",
    state: "Maharashtra",
    district: "Test district",
    name_en: "Other city",
    name_kn: "Other city",
    slug: "other-city",
    lat: null,
    lng: null,
    show_in_weather: false,
  },
];
describe("cascading locations", () => {
  it("separates states and only returns cities from the selected district", () => {
    expect(locationOptions(places).states).toEqual([
      "Karnataka",
      "Maharashtra",
    ]);
    expect(locationOptions(places).districts).toEqual([]);
    expect(
      locationOptions(places, "Karnataka", "ಹಾಸನ").cities.map((p) => p.slug),
    ).toContain("shravanabelagola");
    expect(locationOptions(places, "Maharashtra").districts).toEqual([
      "Test district",
    ]);
    expect(
      locationOptions(places, "Karnataka", "Test district").cities,
    ).toEqual([]);
  });
  it("applies all three levels together, including manually edited URLs", () => {
    const town = places.find((p) => p.slug === "shravanabelagola")!;
    expect(
      matchesLocation(town, {
        state: "Karnataka",
        district: "ಹಾಸನ",
        city: town.slug,
      }),
    ).toBe(true);
    expect(
      matchesLocation(town, { state: "Maharashtra", city: town.slug }),
    ).toBe(false);
    expect(matchesLocation(town, { district: "ಉಡುಪಿ" })).toBe(false);
    expect(matchesLocation(undefined, { state: "Karnataka" })).toBe(false);
    expect(matchesLocation(undefined, {})).toBe(true);
  });
  it("does not treat a district record as a city", () => {
    const district = places.find((p) => p.slug === "hassan")!;
    expect(matchesLocation(district, { city: "hassan" })).toBe(false);
    expect(matchesLocation(district, { district: "ಹಾಸನ" })).toBe(true);
  });
  it("prefers a saved ID and accepts exact legacy names without substring guesses", () => {
    const town = places.find((p) => p.slug === "shravanabelagola")!;
    expect(resolvePlace(places, undefined, "  SHRAVANABELAGOLA ")?.id).toBe(
      town.id,
    );
    expect(resolvePlace(places, town.id, "Wrong name")?.id).toBe(town.id);
    expect(resolvePlace(places, "missing-id", town.name_kn)).toBeUndefined();
    expect(
      resolvePlace(places, undefined, "Near Shravanabelagola"),
    ).toBeUndefined();
  });
});
