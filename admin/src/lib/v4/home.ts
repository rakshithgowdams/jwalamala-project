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
  sections: homeSectionIds.map((id) => ({
    id,
    enabled: id !== "picks",
    count: id === "latest" ? 6 : 3,
    category_slug: "",
  })),
};
