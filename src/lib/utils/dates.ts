import { months } from "@/content/strings.kn";
import { monthsEn } from "@/content/strings.en";
import { monthsHi } from "@/content/strings.hi";
import type { Locale } from "@/lib/i18n/strings";
export function formatDate(
  value: string,
  short = false,
  locale: Locale = "kn",
) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return "";
  const name = { kn: months, en: monthsEn, hi: monthsHi }[locale][month - 1];
  return short ? `${day} ${name}` : `${day} ${name} ${year}`;
}
export function isoToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(
    new Date(),
  );
}
export function duration(seconds: number | null) {
  return seconds
    ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : "";
}
export function safeReturnPath(value: string | null | undefined) {
  return value?.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\x00-\x20]/.test(value)
    ? value
    : "/account";
}
