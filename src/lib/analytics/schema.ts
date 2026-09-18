import { z } from "zod";
export const pulseSchema = z.object({
  post_id: z.uuid(),
  session: z.uuid(),
  seconds: z.number().int().min(0).max(15),
  depth: z.union([
    z.literal(0),
    z.literal(25),
    z.literal(50),
    z.literal(75),
    z.literal(100),
  ]),
  event: z.enum(["view", "engaged", "share", "listen", "video", "push"]),
  source: z
    .enum([
      "direct",
      "google",
      "discover",
      "whatsapp",
      "facebook",
      "youtube",
      "other",
    ])
    .default("direct"),
  device: z.enum(["mobile", "desktop"]),
});
export function sourceBucket(referrer: string, source: string) {
  const value = source.toLowerCase();
  if (["whatsapp", "facebook", "youtube", "discover", "google"].includes(value))
    return value as "whatsapp" | "facebook" | "youtube" | "discover" | "google";
  try {
    const host = new URL(referrer).hostname;
    if (/(^|\.)google\./.test(host)) return "google";
    if (/(^|\.)facebook.com$/.test(host)) return "facebook";
    if (/(^|\.)youtube.com$/.test(host)) return "youtube";
    return "other";
  } catch {
    return "direct";
  }
}
