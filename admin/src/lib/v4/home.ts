import { z } from "zod";

export const homeSectionIds = [
  "lead",
  "events",
  "latest",
  "videos",
  "picks",
  "explore",
  "jain",
  "submit",
] as const;

/** Sliding chips under home Latest news — click opens that section. */
export const latestLinkSchema = z.object({
  id: z.string().min(1).max(64),
  href: z
    .string()
    .min(1)
    .max(200)
    .regex(/^\/[A-Za-z0-9\-/_]*$/),
  label_kn: z.string().min(1).max(120),
  label_en: z.string().min(1).max(120),
  label_hi: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
});

export const defaultLatestLinks: z.infer<typeof latestLinkSchema>[] = [
  {
    id: "state-jain-news",
    href: "/category/state-jain-news",
    label_kn: "ರಾಜ್ಯ ಜೈನ ಸುದ್ದಿಗಳು",
    label_en: "State Jain news",
    label_hi: "राज्य जैन समाचार",
    enabled: true,
  },
  {
    id: "jain-milan",
    href: "/category/jain-milan",
    label_kn: "ಜೈನ್ ಮಿಲನ್ ಸುದ್ದಿಗಳು",
    label_en: "Jain Milan news",
    label_hi: "जैन मिलन समाचार",
    enabled: true,
  },
  {
    id: "other-state-news",
    href: "/category/other-state-news",
    label_kn: "ಹೊರ ರಾಜ್ಯ ಸುದ್ದಿಗಳು",
    label_en: "News from other states",
    label_hi: "अन्य राज्यों के समाचार",
    enabled: true,
  },
  {
    id: "upcoming-events",
    href: "/events",
    label_kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
    label_en: "Upcoming events",
    label_hi: "आगामी कार्यक्रम",
    enabled: true,
  },
];

export const homeSchema = z.object({
  extras: z
    .object({
      feed: z.boolean().default(true),
      stories: z.boolean().default(true),
      photo: z.boolean().default(true),
      parva: z.boolean().default(true),
      history: z.boolean().default(true),
    })
    .default({
      feed: true,
      stories: true,
      photo: true,
      parva: true,
      history: true,
    }),
  photo_gallery_id: z.uuid().or(z.literal("")).default(""),
  lead_id: z.union([z.uuid(), z.literal("")]).default(""),
  pick_ids: z.array(z.uuid()).max(12).default([]),
  /** Optional pinned stories for the Latest grid (not the sliding chips). */
  latest_ids: z.array(z.uuid()).max(24).default([]),
  /** Sliding chips under Latest news on the homepage. */
  latest_links: z.array(latestLinkSchema).max(8).default(defaultLatestLinks),
  sections: z
    .array(
      z.object({
        id: z.enum(homeSectionIds),
        enabled: z.boolean(),
        count: z.number().int().min(1).max(12),
        category_slug: z
          .string()
          .regex(/^[a-z0-9-]*$/)
          .default(""),
      }),
    )
    .max(8)
    .refine((v) => new Set(v.map((s) => s.id)).size === v.length),
});

export type HomeConfig = z.infer<typeof homeSchema>;
export type LatestLink = z.infer<typeof latestLinkSchema>;

export const defaultHome: HomeConfig = {
  extras: {
    feed: true,
    stories: true,
    photo: true,
    parva: true,
    history: true,
  },
  photo_gallery_id: "",
  lead_id: "",
  pick_ids: [],
  latest_ids: [],
  latest_links: defaultLatestLinks,
  sections: homeSectionIds.map((id) => ({
    id,
    enabled: id !== "picks",
    count: id === "latest" ? 6 : 3,
    category_slug: "",
  })),
};
