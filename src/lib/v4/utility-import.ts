import { v4Schemas } from "./admin-schema";
export const utilityFields = {
  jain_calendar_days: [
    "date",
    "title_kn",
    "kind",
    "description_kn",
    "is_major",
  ],
  reservoir_readings: [
    "reservoir_slug",
    "name_kn",
    "reading_date",
    "full_level_m",
    "level_m",
    "storage_pct",
    "inflow_cusecs",
    "outflow_cusecs",
    "source",
  ],
  market_rates: ["rate_date", "kind", "place_id", "value", "unit", "source"],
} as const;
export type UtilityResource = keyof typeof utilityFields;
export function parseUtilityRow(
  resource: UtilityResource,
  row: Record<string, string>,
) {
  const numeric = [
    "full_level_m",
    "level_m",
    "storage_pct",
    "inflow_cusecs",
    "outflow_cusecs",
    "value",
  ];
  const values = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [
      key,
      numeric.includes(key) && !value.trim() ? undefined : value,
    ]),
  );
  return v4Schemas[resource].safeParse({
    ...values,
    place_id: row.place_id || "",
    is_major: row.is_major === "true",
    is_seed: false,
  });
}
