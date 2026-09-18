import { z } from "zod";
export const pushTopics = [
  "breaking",
  "live",
  "daily",
  "events",
  "parva",
] as const;
export function safePushEndpoint(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.port &&
      !u.username &&
      !u.password &&
      (u.hostname === "fcm.googleapis.com" ||
        u.hostname === "web.push.apple.com" ||
        u.hostname.endsWith(".push.services.mozilla.com") ||
        u.hostname.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export const pushPreferencesSchema = z.object({
  enabled: z.boolean(),
  topics: z.array(z.enum(pushTopics)).max(5),
  quiet_start: z.number().int().min(0).max(23),
  quiet_end: z.number().int().min(0).max(23),
  daily_cap: z.number().int().min(1).max(10),
  breaking_override: z.boolean(),
});
export type PushPreferences = z.infer<typeof pushPreferencesSchema>;
export const defaultPush: PushPreferences = {
  enabled: false,
  topics: ["breaking", "live"],
  quiet_start: 22,
  quiet_end: 6,
  daily_cap: 3,
  breaking_override: true,
};
export const pushLabels: Record<string, string> = {
  breaking: "ಬ್ರೇಕಿಂಗ್ ಸುದ್ದಿ",
  live: "ನೇರಪ್ರಸಾರ",
  daily: "ದಿನದ ಮುಖ್ಯ ಸುದ್ದಿ",
  events: "ಕಾರ್ಯಕ್ರಮಗಳು",
  parva: "ಜೈನ ಪರ್ವಗಳು",
};
