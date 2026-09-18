import { roles } from "@/lib/v4/control-schema";
import { z } from "zod";
import { kn } from "@/content/strings.kn";
export const resources = {
  categories: {
    title: kn.categories,
    fields: [
      ["name_kn", kn.title, "text"],
      ["name_en", "English name", "text"],
      ["slug", kn.slug, "text"],
      ["sort_order", kn.sort, "number"],
    ],
  },
  events: {
    title: kn.events,
    fields: [
      ["name_kn", kn.title, "text"],
      ["name_en", "English name", "text"],
      ["slug", kn.slug, "text"],
      ["start_date", kn.from, "date"],
      ["end_date", kn.to, "date"],
      ["place", kn.place, "text"],
      ["district", kn.town, "text"],
      ["organiser", kn.organiser, "text"],
      ["description_kn", kn.summary, "textarea"],
    ],
  },
  ads: {
    title: kn.advertise,
    fields: [
      ["advertiser", kn.name, "text"],
      ["slot", kn.place, "text"],
      ["image_url", kn.link, "url"],
      ["target_url", kn.link, "url"],
      ["alt_kn", kn.summary, "text"],
      ["starts_at", kn.from, "datetime-local"],
      ["ends_at", kn.to, "datetime-local"],
      ["is_active", kn.status, "checkbox"],
    ],
  },
  submissions: {
    title: kn.submissions,
    fields: [["status", kn.status, "text"]],
  },
  users: { title: kn.users, fields: [["role", kn.status, "text"]] },
  settings: {
    title: kn.settings,
    fields: [
      ["key", kn.title, "text"],
      ["value", kn.body, "textarea"],
    ],
  },
} as const;
export type Resource = keyof typeof resources;
export const resourceSchemas = {
  categories: z.object({
    name_kn: z.string().min(1).max(200),
    name_en: z.string().max(200),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    sort_order: z.coerce.number().int(),
  }),
  events: z
    .object({
      name_kn: z.string().min(1),
      name_en: z.string(),
      slug: z.string().regex(/^[a-z0-9-]+$/),
      start_date: z.iso.date(),
      end_date: z.iso.date(),
      place: z.string(),
      district: z.string(),
      organiser: z.string(),
      description_kn: z.string(),
    })
    .refine((v) => v.end_date >= v.start_date),
  ads: z
    .object({
      advertiser: z.string().min(1),
      slot: z.enum([
        "home_banner",
        "sidebar",
        "in_article",
        "category_top",
        "event_sponsor",
      ]),
      image_url: z.url(),
      target_url: z.url(),
      alt_kn: z.string().min(1),
      starts_at: z.string().min(1),
      ends_at: z.string().min(1),
      is_active: z.boolean(),
    })
    .refine((v) => new Date(v.ends_at) > new Date(v.starts_at)),
  submissions: z.object({
    status: z.enum(["new", "in_review", "converted", "replied", "archived"]),
  }),
  users: z.object({ role: z.enum(["admin", ...roles]) }),
  settings: z.object({
    key: z.string().min(1).max(100),
    value: z.string().max(10000),
  }),
};
