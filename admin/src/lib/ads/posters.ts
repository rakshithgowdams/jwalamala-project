import { z } from "zod";
import { isHostedImage } from "@/lib/utils/images";

/** 16:9 fills content-width spaces, 1:1 fills sidebars; "any" is a legacy banner. */
export const posterShapes = ["landscape", "square"] as const;
export type PosterShape = (typeof posterShapes)[number];
export type CreativeShape = PosterShape | "any";
/** What a reserved space can hold. The mobile sticky strip is too short for a poster. */
export type SlotShape = PosterShape | "strip";

export const posterSizes: Record<
  PosterShape,
  { width: number; height: number }
> = {
  landscape: { width: 1280, height: 720 },
  square: { width: 1080, height: 1080 },
};

export function slotShape(slotKey: string, format: string): SlotShape {
  if (slotKey === "global_mobile_sticky") return "strip";
  return format === "rectangle" ? "square" : "landscape";
}

/**
 * Page groups an editor picks from. Each maps to the first path segment the ad
 * picker sees (pickAd's page_type), so a group covers its listing and detail pages.
 */
export const posterPageGroups = [
  { key: "home", kn: "ಮುಖಪುಟ", en: "Home", types: ["home"] },
  {
    key: "news",
    kn: "ಸುದ್ದಿ ಮತ್ತು ಲೇಖನಗಳು",
    en: "News & articles",
    types: ["news", "archive"],
  },
  {
    key: "videos",
    kn: "ವಿಡಿಯೋ, ಶಾರ್ಟ್ಸ್, ನೇರ ವರದಿ",
    en: "Videos, shorts & live",
    types: ["video", "videos", "shorts", "live"],
  },
  {
    key: "categories",
    kn: "ವಿಭಾಗ, ಟ್ಯಾಗ್, ವಿಷಯ, ಸರಣಿ",
    en: "Categories, tags, topics & series",
    types: ["category", "tag", "topic", "topics", "series", "author"],
  },
  {
    key: "districts",
    kn: "ಜಿಲ್ಲೆ ಮತ್ತು ಊರು",
    en: "Districts & towns",
    types: ["districts", "place"],
  },
  {
    key: "events",
    kn: "ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಪಂಚಾಂಗ",
    en: "Events & Jain calendar",
    types: ["events", "jain-calendar"],
  },
  {
    key: "community",
    kn: "ಬಸದಿ, ಪ್ರಕಟಣೆ, ಅವಕಾಶ",
    en: "Basadis, notices & opportunities",
    types: ["basadis", "notices", "opportunities"],
  },
  {
    key: "gallery",
    kn: "ಚಿತ್ರ ಸಂಗ್ರಹ ಮತ್ತು ಕಥೆಗಳು",
    en: "Galleries & web stories",
    types: ["gallery", "stories"],
  },
  {
    key: "utilities",
    kn: "ಹವಾಮಾನ, ಜಲಾಶಯ, ದರ",
    en: "Weather, reservoirs & rates",
    types: ["weather", "reservoirs", "rates"],
  },
  {
    key: "engagement",
    kn: "ಸಮೀಕ್ಷೆ ಮತ್ತು ರಸಪ್ರಶ್ನೆ",
    en: "Polls & quizzes",
    types: ["polls", "quizzes"],
  },
] as const;
export type PosterPageGroup = (typeof posterPageGroups)[number]["key"];
const groupKeys = posterPageGroups.map((g) => g.key) as [
  PosterPageGroup,
  ...PosterPageGroup[],
];

/** No groups means every page that carries ads. */
export const pagesForGroups = (groups: readonly string[]) => [
  ...new Set(
    posterPageGroups
      .filter((group) => groups.includes(group.key))
      .flatMap((group) => group.types),
  ),
];
export const groupsForPages = (pages: readonly string[]) =>
  posterPageGroups
    .filter((group) => group.types.every((type) => pages.includes(type)))
    .map((group) => group.key);

const image = z
  .string()
  .trim()
  .refine(isHostedImage, "Use an uploaded image or an ImageKit link");
/** datetime-local values are entered in India time. */
const istTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  .transform((value) => new Date(value + "+05:30").toISOString());

export const posterSchema = z
  .object({
    advertiser: z.string().trim().min(1).max(150),
    shape: z.enum(posterShapes),
    image_url: image,
    target_url: z
      .union([
        z.literal(""),
        z
          .url()
          .max(1000)
          .refine((value) => {
            const url = new URL(value);
            return url.protocol === "https:" && !url.username && !url.password;
          }),
      ])
      .transform((value) => value || null),
    alt_kn: z.string().trim().min(1).max(300),
    alt_en: z.string().trim().max(300).default(""),
    alt_hi: z.string().trim().max(300).default(""),
    pages: z.array(z.enum(groupKeys)).max(groupKeys.length),
    device: z.enum(["all", "mobile", "desktop"]),
    starts_at: istTime,
    ends_at: istTime,
    is_active: z.boolean(),
    priority: z.coerce.number().int().min(-100).max(100),
  })
  .refine((value) => Date.parse(value.ends_at) > Date.parse(value.starts_at), {
    path: ["ends_at"],
  });
export type PosterInput = z.input<typeof posterSchema>;

/** The ads row a poster is stored as; slot keys stay empty so it fills every fitting space. */
export function posterRow(input: z.output<typeof posterSchema>) {
  const { pages, ...rest } = input;
  return {
    ...rest,
    target_pages: pagesForGroups(pages),
    slot_keys: [] as string[],
    slot: input.shape === "square" ? "sidebar" : "home_banner",
    mobile_image_url: null,
  };
}

export type PosterState = "off" | "scheduled" | "live" | "expired";
/** Mirrors pick_manual_ad: the dates switch a poster on and off by themselves. */
export function posterState(
  row: { is_active: boolean; starts_at: string; ends_at: string },
  now = Date.now(),
): PosterState {
  if (Date.parse(row.ends_at) <= now) return "expired";
  if (!row.is_active) return "off";
  if (Date.parse(row.starts_at) > now) return "scheduled";
  return "live";
}
