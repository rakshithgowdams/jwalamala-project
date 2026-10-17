import { getTimes } from "suncalc";
import { z } from "zod";
export const jainRulesSchema = z
  .object({
    approved: z.boolean(),
    approved_by: z.string().max(150),
    rules: z
      .array(
        z.object({
          name_kn: z.string().min(1).max(100),
          base: z.enum(["sunrise", "sunset", "daylight"]),
          offset: z.number().min(-240).max(240),
          fraction: z.number().min(0).max(1).optional(),
          visible: z.boolean(),
        }),
      )
      .max(20),
  })
  .refine((value) => !value.approved || value.approved_by.trim().length > 0);
export type JainRules = z.infer<typeof jainRulesSchema>;
export function dailyTimes(
  date: string,
  lat: number,
  lng: number,
  rules?: JainRules,
) {
  if (
    !z.iso.date().safeParse(date).success ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    throw new Error("Invalid place or date");
  const times = getTimes(new Date(date + "T12:00:00+05:30"), lat, lng);
  const observances =
    rules?.approved && times.sunrise && times.sunset
      ? rules.rules
          .filter((rule) => rule.visible)
          .map((rule) => {
            const base =
              rule.base === "sunrise"
                ? times.sunrise!
                : rule.base === "sunset"
                  ? times.sunset!
                  : new Date(
                      times.sunrise!.getTime() +
                        (times.sunset!.getTime() - times.sunrise!.getTime()) *
                          (rule.fraction ?? 0),
                    );
            return {
              name: rule.name_kn,
              time: new Date(
                base.getTime() + rule.offset * 60000,
              ).toISOString(),
            };
          })
      : [];
  return {
    sunrise: times.sunrise?.toISOString() || null,
    sunset: times.sunset?.toISOString() || null,
    observances,
  };
}
export function istTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(value))
    : "—";
}
