import type { Locale } from "@/lib/i18n/strings";

export type NumberFormat = "number" | "compact" | "percent" | "duration";

/** Dashboard numbers: Indian digit grouping, compact above ten thousand, m:ss durations. */
export function formatValue(value: number, format: NumberFormat = "number", locale: Locale = "en") {
  const tag = locale + "-IN";
  if (format === "percent") return `${Math.round(value)}%`;
  if (format === "duration") {
    const minutes = Math.floor(value / 60);
    return `${minutes}:${String(Math.round(value % 60)).padStart(2, "0")}`;
  }
  if (format === "compact" && Math.abs(value) >= 10000)
    return new Intl.NumberFormat(tag, { notation: "compact", maximumFractionDigits: 1 }).format(value);
  return Math.round(value).toLocaleString(tag);
}
