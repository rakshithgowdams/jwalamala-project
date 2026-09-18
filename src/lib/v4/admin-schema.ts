import { z } from "zod";
import { v4 as t, kn } from "@/content/strings.kn";
import { safePublicLink } from "./utils";
const title = z.string().trim().min(1).max(300),
  body = z.string().max(20000),
  slug = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(150);
const nullableId = z
  .union([z.uuid(), z.literal("")])
  .transform((value) => value || null);
const image = z
  .string()
  .refine(
    (value) =>
      value.startsWith("/images/") ||
      /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\//.test(
        value,
      ),
    "Use an uploaded image",
  )
  .default("/images/jwalamala-logo.jpg");
const jsonArray = <T extends z.ZodType>(schema: T) =>
  z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value || "[]");
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid list" });
        return z.NEVER;
      }
    })
    .pipe(z.array(schema));
const bool = z.boolean();
const number = z.coerce.number().finite();
const time = z
  .union([
    z.iso.datetime({ offset: true }),
    z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
    z.literal(""),
  ])
  .transform((value) =>
    value
      ? new Date(value.length === 16 ? value + "+05:30" : value).toISOString()
      : null,
  );
const photo = z.object({
  url: image,
  caption: z.string().max(300).optional(),
  credit: title,
});
export const v4Schemas = {
  ad_campaigns: z
    .object({
      slug,
      advertiser: title,
      is_active: bool,
      starts_at: time,
      ends_at: time,
    })
    .refine((v) => !!v.starts_at && !!v.ends_at && v.ends_at > v.starts_at),
  ads: z
    .object({
      advertiser: title,
      slot: z.enum([
        "home_banner",
        "sidebar",
        "in_article",
        "category_top",
        "event_sponsor",
      ]),
      image_url: image,
      mobile_image_url: z
        .union([z.literal(""), image])
        .transform((v) => v || null),
      target_url: z
        .url()
        .refine(
          (v) =>
            new URL(v).protocol === "https:" &&
            !new URL(v).username &&
            !new URL(v).password,
        ),
      alt_kn: title,
      starts_at: time,
      ends_at: time,
      is_active: bool,
      campaign_id: nullableId,
      slot_keys: jsonArray(z.string().regex(/^[a-z_]+$/)),
      category_ids: jsonArray(z.uuid()),
      target_places: jsonArray(z.uuid()),
      target_pages: jsonArray(z.string().max(50)),
      device: z.enum(["all", "mobile", "desktop"]),
      priority: number.int(),
      weight: number.int().min(1).max(1000),
      max_impressions: z
        .union([z.literal(""), number.int().nonnegative()])
        .transform((v) => (v === "" ? null : v)),
      max_clicks: z
        .union([z.literal(""), number.int().nonnegative()])
        .transform((v) => (v === "" ? null : v)),
      daily_impression_cap: z
        .union([z.literal(""), number.int().nonnegative()])
        .transform((v) => (v === "" ? null : v)),
    })
    .refine((v) => !!v.starts_at && !!v.ends_at && v.ends_at > v.starts_at),
  tags: z.object({
    slug,
    name_kn: title,
    name_en: z.string().max(150),
    is_hidden_from_trending: bool,
  }),
  places: z.object({
    slug,
    state: z.string().trim().min(1).max(150).default("Karnataka"),
    name_kn: title,
    name_en: z.string().max(150),
    district: title,
    lat: z
      .union([z.literal(""), number.min(-90).max(90)])
      .transform((value) => (value === "" ? null : value)),
    lng: z
      .union([z.literal(""), number.min(-180).max(180)])
      .transform((value) => (value === "" ? null : value)),
    is_district: bool,
    show_in_weather: bool,
  }),
  authors: z.object({
    slug,
    name_kn: title,
    role_kn: title,
    bio_kn: body,
    credentials_kn: body,
    is_active: bool,
  }),
  topics: z.object({
    slug,
    title_kn: title,
    intro_kn: body,
    cover_url: image,
    is_active: bool,
    sort_order: number.int(),
    key_facts: jsonArray(z.string().max(500)),
    tag_ids: jsonArray(z.uuid()),
    timeline: jsonArray(z.object({ date: z.iso.date(), text: title })),
    event_ids: jsonArray(z.uuid()),
    liveblog_post_id: nullableId,
  }),
  trending_items: z
    .object({
      label_kn: title,
      url: z.string().refine((value) => !!safePublicLink(value)),
      type: z.enum(["tag", "topic", "page", "category", "external", "live"]),
      is_highlight: bool,
      starts_at: time,
      ends_at: time,
      sort_order: number.int(),
      is_active: bool,
    })
    .refine(
      (value) =>
        !value.starts_at ||
        !value.ends_at ||
        Date.parse(value.ends_at) > Date.parse(value.starts_at),
    ),
  series: z.object({
    slug,
    title_kn: title,
    description_kn: body,
    cover_url: image,
    is_active: bool,
  }),
  jain_calendar_days: z.object({
    date: z.iso.date(),
    title_kn: title,
    kind: z.enum(["parva", "tithi", "festival", "note"]),
    description_kn: body,
    is_major: bool,
    is_seed: bool,
  }),
  basadis: z.object({
    slug,
    name_kn: title,
    name_en: z.string(),
    place_id: nullableId,
    deity_kn: z.string(),
    history_kn: body,
    timings_kn: z.string().max(1000),
    contact: z.string().max(200),
    lat: z
      .union([z.literal(""), number.min(-90).max(90)])
      .transform((value) => (value === "" ? null : value)),
    lng: z
      .union([z.literal(""), number.min(-180).max(180)])
      .transform((value) => (value === "" ? null : value)),
    photos: jsonArray(photo),
    status: z.enum(["draft", "published"]),
    is_seed: bool,
  }),
  notices: z.object({
    slug,
    type: z.enum([
      "shraddhanjali",
      "abhinandane",
      "amantrana",
      "anniversary",
      "sanmana",
      "student_achievement",
    ]),
    title_kn: title,
    person_name: z.string().max(150),
    body_kn: body,
    place_id: nullableId,
    event_date: z.iso.date(),
    contact: z.string().max(200),
    status: z.enum(["pending", "approved", "rejected"]),
    published_at: time,
    is_seed: bool,
  }),
  opportunities: z.object({
    slug,
    title_kn: title,
    org: title,
    kind: z.enum(["job", "scholarship", "competition", "admission"]),
    place_id: nullableId,
    last_date: z.iso.date(),
    link: z
      .union([
        z.literal(""),
        z.url().refine((value) => new URL(value).protocol === "https:"),
      ])
      .transform((value) => value || null),
    contact: z.string().max(200),
    description_kn: body,
    status: z.enum(["pending", "approved", "rejected"]),
    is_seed: bool,
  }),
  liveblogs: z.object({
    slug,
    title_kn: title,
    summary_kn: body,
    cover_url: image,
    event_date: z.iso.date(),
    is_live: bool,
    status: z.enum(["draft", "published"]),
    published_at: time,
    is_seed: bool,
  }),
  galleries: z
    .object({
      slug,
      title_kn: title,
      description_kn: body,
      images: jsonArray(photo),
      event_date: z.iso.date(),
      status: z.enum(["draft", "published"]),
      is_seed: bool,
    })
    .refine((value) => value.status !== "published" || value.images.length > 0),
  web_stories: z
    .object({
      slug,
      title_kn: title,
      cover_url: image,
      slides: jsonArray(
        z.object({
          image,
          text: title,
          credit: title,
          href: z
            .string()
            .refine((value) => !!safePublicLink(value))
            .optional(),
        }),
      ),
      status: z.enum(["draft", "published"]),
      published_at: time,
      is_seed: bool,
    })
    .refine(
      (value) =>
        value.status !== "published" ||
        (value.slides.length >= 5 && value.slides.length <= 15),
    ),
  polls: z
    .object({
      question_kn: title,
      options: jsonArray(z.string().min(1).max(200)).pipe(
        z.array(z.string()).min(2).max(8),
      ),
      ends_at: time,
      status: z.enum(["draft", "active", "closed"]),
      is_seed: bool,
    })
    .refine((value) => !!value.ends_at),
  quizzes: z.object({
    slug,
    title_kn: title,
    questions: jsonArray(
      z
        .object({
          question: title,
          options: z.array(z.string().min(1)).min(2).max(6),
          answer: number.int().min(0),
          explanation: title,
        })
        .refine((question) => question.answer < question.options.length),
    ),
    status: z.enum(["draft", "published"]),
    is_seed: bool,
  }),
  reservoir_readings: z.object({
    reservoir_slug: slug,
    name_kn: title,
    reading_date: z.iso.date(),
    full_level_m: number.nonnegative(),
    level_m: number.nonnegative(),
    storage_pct: number.min(0).max(100),
    inflow_cusecs: number.nonnegative(),
    outflow_cusecs: number.nonnegative(),
    source: title,
    is_seed: bool,
  }),
  market_rates: z.object({
    rate_date: z.iso.date(),
    kind: z.enum(["gold22", "gold24", "silver", "petrol", "diesel"]),
    place_id: nullableId,
    value: number.nonnegative(),
    unit: title,
    source: title,
    is_seed: bool,
  }),
};
export type V4Resource = keyof typeof v4Schemas;
export type Field = {
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "date"
    | "datetime-local"
    | "checkbox"
    | "select"
    | "list"
    | "ids"
    | "structured";
  options?: string[];
};
const f = (
  name: string,
  label: string,
  type: Field["type"] = "text",
  options?: string[],
): Field => ({ name, label, type, options });
const standard = [f("slug", kn.slug), f("title_kn", kn.title)];
const publication = [
  f("status", kn.status, "select", ["draft", "published"]),
  f("is_seed", t.sample, "checkbox"),
];
export const v4Resources: Record<
  V4Resource,
  { title: string; permission: string; fields: Field[] }
> = {
  ad_campaigns: {
    title: t.campaigns,
    permission: "ads.manage",
    fields: [
      f("slug", kn.slug),
      f("advertiser", kn.name),
      f("is_active", t.enabled, "checkbox"),
      f("starts_at", t.start, "datetime-local"),
      f("ends_at", t.end, "datetime-local"),
    ],
  },
  ads: {
    title: kn.advertise,
    permission: "ads.manage",
    fields: [
      f("advertiser", kn.name),
      f("slot", t.legacySlot, "select", [
        "home_banner",
        "sidebar",
        "in_article",
        "category_top",
        "event_sponsor",
      ]),
      f("image_url", t.image),
      f("mobile_image_url", t.mobileImage),
      f("target_url", kn.link),
      f("alt_kn", t.alt),
      f("campaign_id", t.campaigns),
      f("slot_keys", t.adSlots, "list"),
      f("category_ids", kn.categories, "ids"),
      f("target_places", t.places, "ids"),
      f("target_pages", t.targetPages, "list"),
      f("device", t.device, "select", ["all", "mobile", "desktop"]),
      f("priority", t.priority, "number"),
      f("weight", t.weight, "number"),
      f("starts_at", t.start, "datetime-local"),
      f("ends_at", t.end, "datetime-local"),
      f("max_impressions", t.impressionCap, "number"),
      f("max_clicks", t.clickCap, "number"),
      f("daily_impression_cap", t.dailyCap, "number"),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  tags: {
    title: t.tags,
    permission: "content.edit",
    fields: [
      f("slug", kn.slug),
      f("name_kn", kn.title),
      f("name_en", "English"),
      f("is_hidden_from_trending", t.hide, "checkbox"),
    ],
  },
  places: {
    title: t.places,
    permission: "content.edit",
    fields: [
      f("state", "ರಾಜ್ಯ / State"),
      f("slug", kn.slug),
      f("name_kn", kn.title),
      f("name_en", "English"),
      f("district", t.district),
      f("lat", t.latitude, "number"),
      f("lng", t.longitude, "number"),
      f("is_district", t.district, "checkbox"),
      f("show_in_weather", t.weather, "checkbox"),
    ],
  },
  authors: {
    title: t.authors,
    permission: "content.edit",
    fields: [
      f("slug", kn.slug),
      f("name_kn", kn.name),
      f("role_kn", kn.status),
      f("bio_kn", kn.summary, "textarea"),
      f("credentials_kn", t.credentials, "textarea"),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  topics: {
    title: t.topics,
    permission: "content.edit",
    fields: [
      ...standard,
      f("intro_kn", kn.summary, "textarea"),
      f("cover_url", kn.link),
      f("key_facts", t.keyFacts, "list"),
      f("tag_ids", t.tags, "ids"),
      f("timeline", t.timeline, "structured"),
      f("event_ids", kn.events, "ids"),
      f("liveblog_post_id", t.liveblog),
      f("sort_order", t.order, "number"),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  trending_items: {
    title: t.trendingTopics,
    permission: "content.edit",
    fields: [
      f("label_kn", kn.title),
      f("url", kn.link),
      f("type", t.contentType, "select", [
        "tag",
        "topic",
        "page",
        "category",
        "external",
        "live",
      ]),
      f("starts_at", t.start, "datetime-local"),
      f("ends_at", t.end, "datetime-local"),
      f("sort_order", t.order, "number"),
      f("is_highlight", t.pinned, "checkbox"),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  series: {
    title: t.series,
    permission: "content.edit",
    fields: [
      ...standard,
      f("description_kn", kn.summary, "textarea"),
      f("cover_url", kn.link),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  jain_calendar_days: {
    title: t.jainCalendar,
    permission: "content.edit",
    fields: [
      f("date", kn.eventDate, "date"),
      f("title_kn", kn.title),
      f("kind", t.contentType, "select", [
        "parva",
        "tithi",
        "festival",
        "note",
      ]),
      f("description_kn", kn.summary, "textarea"),
      f("is_major", t.pinned, "checkbox"),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  basadis: {
    title: t.basadis,
    permission: "community.manage",
    fields: [
      f("slug", kn.slug),
      f("name_kn", kn.title),
      f("name_en", "English"),
      f("place_id", kn.place),
      f("deity_kn", t.deity),
      f("history_kn", kn.body, "textarea"),
      f("timings_kn", t.timings),
      f("contact", kn.contact),
      f("lat", t.latitude, "number"),
      f("lng", t.longitude, "number"),
      f("photos", t.gallery, "structured"),
      ...publication,
    ],
  },
  notices: {
    title: t.notices,
    permission: "community.manage",
    fields: [
      ...standard,
      f("type", t.contentType, "select", [
        "shraddhanjali",
        "abhinandane",
        "amantrana",
        "anniversary",
        "sanmana",
        "student_achievement",
      ]),
      f("person_name", kn.name),
      f("body_kn", kn.body, "textarea"),
      f("place_id", kn.place),
      f("event_date", kn.eventDate, "date"),
      f("contact", kn.contact),
      f("status", kn.status, "select", ["pending", "approved", "rejected"]),
      f("published_at", kn.published, "datetime-local"),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  opportunities: {
    title: t.opportunities,
    permission: "community.manage",
    fields: [
      ...standard,
      f("org", t.organisation),
      f("kind", t.contentType, "select", [
        "job",
        "scholarship",
        "competition",
        "admission",
      ]),
      f("place_id", kn.place),
      f("last_date", t.deadline, "date"),
      f("link", kn.link),
      f("contact", kn.contact),
      f("description_kn", kn.body, "textarea"),
      f("status", kn.status, "select", ["pending", "approved", "rejected"]),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  liveblogs: {
    title: t.liveblogs,
    permission: "content.edit",
    fields: [
      ...standard,
      f("summary_kn", kn.summary, "textarea"),
      f("cover_url", kn.link),
      f("event_date", kn.eventDate, "date"),
      f("is_live", kn.live, "checkbox"),
      f("published_at", kn.published, "datetime-local"),
      ...publication,
    ],
  },
  galleries: {
    title: t.gallery,
    permission: "content.edit",
    fields: [
      ...standard,
      f("description_kn", kn.summary, "textarea"),
      f("images", t.gallery, "structured"),
      f("event_date", kn.eventDate, "date"),
      ...publication,
    ],
  },
  web_stories: {
    title: t.stories,
    permission: "content.edit",
    fields: [
      ...standard,
      f("cover_url", kn.link),
      f("slides", t.stories, "structured"),
      f("published_at", kn.published, "datetime-local"),
      ...publication,
    ],
  },
  polls: {
    title: t.polls,
    permission: "content.edit",
    fields: [
      f("question_kn", kn.title),
      f("options", t.options, "list"),
      f("ends_at", t.end, "datetime-local"),
      f("status", kn.status, "select", ["draft", "active", "closed"]),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  quizzes: {
    title: t.quizzes,
    permission: "content.edit",
    fields: [
      ...standard,
      f("questions", t.quizzes, "structured"),
      ...publication,
    ],
  },
  reservoir_readings: {
    title: t.reservoirs,
    permission: "content.edit",
    fields: [
      f("reservoir_slug", kn.slug),
      f("name_kn", kn.title),
      f("reading_date", kn.eventDate, "date"),
      f("full_level_m", t.fullLevel, "number"),
      f("level_m", t.currentLevel, "number"),
      f("storage_pct", t.storage, "number"),
      f("inflow_cusecs", t.inflow, "number"),
      f("outflow_cusecs", t.outflow, "number"),
      f("source", t.source),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  market_rates: {
    title: t.rates,
    permission: "content.edit",
    fields: [
      f("rate_date", kn.eventDate, "date"),
      f("kind", t.contentType, "select", [
        "gold22",
        "gold24",
        "silver",
        "petrol",
        "diesel",
      ]),
      f("place_id", kn.place),
      f("value", t.value, "number"),
      f("unit", t.unit),
      f("source", t.source),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
};
