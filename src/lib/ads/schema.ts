import { z } from "zod";
import type { CreativeShape } from "./posters";
export const adSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  adsense_enabled: z.boolean().default(false),
  adsense_client_id: z
    .string()
    .regex(/^ca-pub-\d{16}$/)
    .or(z.literal(""))
    .default(""),
  test_mode: z.boolean().default(true),
  sticky_mobile_enabled: z.boolean().default(false),
  ads_txt: z.string().max(10000).default(""),
});
export type AdSettings = z.infer<typeof adSettingsSchema>;
export const defaultAds: AdSettings = {
  enabled: true,
  adsense_enabled: false,
  adsense_client_id: "",
  test_mode: true,
  sticky_mobile_enabled: false,
  ads_txt: "",
};
export const adSlotSchema = z.object({
  slot_key: z.string(),
  mode: z.enum(["manual", "google", "manual_then_google", "off"]),
  adsense_slot_id: z.string().regex(/^\d*$/),
  adsense_format: z.enum(["auto", "fluid", "in-article"]),
  enabled: z.boolean(),
});
export type SlotConfig = z.infer<typeof adSlotSchema>;
export type AdCreative = {
  id: string;
  image_url: string;
  mobile_image_url: string | null;
  alt_kn: string;
  alt_en?: string;
  alt_hi?: string;
  token: string;
  shape: CreativeShape;
  /** A poster may be awareness-only; without a link it is shown but not clickable. */
  linked: boolean;
};
export type AdPick =
  | { mode: "manual"; creative: AdCreative }
  | { mode: "google"; client: string; slot: string; format: string }
  | { mode: "test" }
  | { mode: "off" };
export const slotKeys = [
  "home_top_leaderboard",
  "home_hero_sidebar",
  "home_after_hero",
  "home_between_sections",
  "home_sidebar_sticky",
  "home_footer_banner",
  "category_top",
  "category_in_grid",
  "category_sidebar",
  "article_top",
  "article_in_content_1",
  "article_in_content_2",
  "article_end",
  "article_sidebar_top",
  "article_sidebar_sticky",
  "video_below_player",
  "video_sidebar",
  "search_inline",
  "events_sidebar",
  "district_top",
  "district_sidebar",
  "district_bottom",
  "global_mobile_sticky",
] as const;
export function canonicalSlot(placement: string) {
  if ((slotKeys as readonly string[]).includes(placement)) return placement;
  if (/^districts?-/.test(placement))
    return placement.includes("sidebar")
      ? "district_sidebar"
      : placement.includes("bottom")
        ? "district_bottom"
        : "district_top";
  if (placement.includes("sidebar"))
    return placement.startsWith("home")
      ? "home_hero_sidebar"
      : placement.startsWith("video")
        ? "video_sidebar"
        : placement.startsWith("article")
          ? "article_sidebar_top"
          : "category_sidebar";
  if (placement.startsWith("home"))
    return placement.includes("bottom")
      ? "home_footer_banner"
      : placement.includes("top")
        ? "home_top_leaderboard"
        : "home_after_hero";
  if (/^(article|video|live|gallery)-/.test(placement))
    return placement.includes("top")
      ? "article_top"
      : placement.includes("update")
        ? "article_in_content_1"
        : "article_end";
  return "category_top";
}
export function routeAllowsAds(path: string) {
  return (
    path === "/" ||
    (/^\/(news|video|videos|category|tag|topic|topics|place|author|archive|events|series|gallery|live|stories|shorts|basadis|notices|opportunities|polls|quizzes|weather|jain-calendar|reservoirs|rates|districts)(\/|$)/.test(
      path,
    ) &&
      !path.endsWith("/submit"))
  );
}
export function safeAdTarget(value: string) {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}
