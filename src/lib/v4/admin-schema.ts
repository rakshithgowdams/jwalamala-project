import { z } from "zod";
import { v4 as t, kn } from "@/content/strings.kn";
import { safePublicLink } from "./utils";
import { businessAdFormats, businessCategories } from "@/lib/ads/business";
const title = z.string().trim().min(1).max(300),
  body = z.string().max(20000),
  slug = z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(150);
const translation = (max = 300) => z.string().max(max).default("");
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
  caption_en: z.string().max(300).optional(),
  caption_hi: z.string().max(300).optional(),
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
      alt_en: translation(),
      alt_hi: translation(),
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
  business_ads: z
    .object({
      status: z.enum(["pending", "approved", "paused", "rejected"]),
      payment_status: z.enum(["unpaid", "paid", "waived"]),
      amount: z
        .union([z.literal(""), number.nonnegative()])
        .transform((v) => (v === "" ? null : v)),
      payment_ref: z.string().trim().max(200).default(""),
      slug,
      name_kn: z.string().trim().min(1).max(150),
      name_en: translation(150),
      name_hi: translation(150),
      category: z.enum(businessCategories),
      offer_kn: z.string().trim().max(160).default(""),
      offer_en: translation(160),
      offer_hi: translation(160),
      image_url: z.union([z.literal(""), image]).transform((v) => v || null),
      phone: z
        .string()
        .trim()
        .regex(/^(\+?[0-9][0-9 -]{7,19})?$/),
      whatsapp: z
        .string()
        .trim()
        .regex(/^(\+?[0-9][0-9 -]{7,19})?$/),
      website: z
        .union([
          z.literal(""),
          z
            .url()
            .max(500)
            .refine((v) => new URL(v).protocol === "https:"),
        ])
        .transform((v) => v || null),
      address_kn: z.string().trim().max(300).default(""),
      place_id: nullableId,
      target_places: jsonArray(z.uuid()),
      starts_at: time,
      ends_at: time,
      priority: number.int(),
      weight: number.int().min(1).max(1000),
      contact_name: z.string().trim().max(100).default(""),
      contact_email: z.union([z.literal(""), z.email().max(254)]).default(""),
      contact_phone: z.string().trim().max(20).default(""),
      requested_formats: jsonArray(z.enum(businessAdFormats)),
      message: z.string().max(2000).default(""),
      review_note: z.string().max(2000).default(""),
      is_seed: bool,
    })
    .refine((v) => !v.starts_at || !v.ends_at || v.ends_at > v.starts_at)
    // An approved ad without an end date would run, and bill, forever.
    .refine((v) => v.status !== "approved" || (!!v.starts_at && !!v.ends_at)),
  tags: z.object({
    slug,
    name_kn: title,
    name_en: translation(150),
    name_hi: translation(150),
    is_hidden_from_trending: bool,
  }),
  places: z.object({
    slug,
    state: z.string().trim().min(1).max(150).default("Karnataka"),
    name_kn: title,
    name_en: translation(150),
    name_hi: translation(150),
    district: title,
    lat: z
      .union([z.literal(""), number.min(-90).max(90)])
      .transform((value) => (value === "" ? null : value)),
    lng: z
      .union([z.literal(""), number.min(-180).max(180)])
      .transform((value) => (value === "" ? null : value)),
    is_district: bool,
    show_in_weather: bool,
    show_in_district_news: bool,
    sort_order: number.int(),
    cover_url: z
      .union([z.literal(""), image])
      .transform((value) => value || null),
    description_kn: z.string().max(2000).default(""),
    description_en: translation(2000),
    description_hi: translation(2000),
  }),
  authors: z.object({
    slug,
    name_kn: title,
    role_kn: title,
    bio_kn: body,
    credentials_kn: body,
    name_en: translation(),
    role_en: translation(),
    bio_en: translation(20000),
    credentials_en: translation(20000),
    name_hi: translation(),
    role_hi: translation(),
    bio_hi: translation(20000),
    credentials_hi: translation(20000),
    is_active: bool,
  }),
  topics: z.object({
    slug,
    title_kn: title,
    intro_kn: body,
    title_en: translation(),
    intro_en: translation(20000),
    title_hi: translation(),
    intro_hi: translation(20000),
    cover_url: image,
    is_active: bool,
    sort_order: number.int(),
    key_facts: jsonArray(z.string().max(500)),
    key_facts_en: jsonArray(z.string().max(500)),
    key_facts_hi: jsonArray(z.string().max(500)),
    tag_ids: jsonArray(z.uuid()),
    timeline: jsonArray(
      z.object({
        date: z.iso.date(),
        text: title,
        text_en: z.string().max(300).optional(),
        text_hi: z.string().max(300).optional(),
      }),
    ),
    event_ids: jsonArray(z.uuid()),
    liveblog_post_id: nullableId,
  }),
  trending_items: z
    .object({
      label_kn: title,
      label_en: translation(),
      label_hi: translation(),
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
    title_en: translation(),
    description_en: translation(20000),
    title_hi: translation(),
    description_hi: translation(20000),
    cover_url: image,
    is_active: bool,
  }),
  jain_calendar_days: z.object({
    date: z.iso.date(),
    title_kn: title,
    kind: z.enum(["parva", "tithi", "festival", "note"]),
    description_kn: body,
    title_en: translation(),
    description_en: translation(20000),
    title_hi: translation(),
    description_hi: translation(20000),
    is_major: bool,
    is_seed: bool,
  }),
  basadis: z.object({
    slug,
    name_kn: title,
    name_en: translation(),
    name_hi: translation(),
    place_id: nullableId,
    deity_kn: z.string(),
    history_kn: body,
    timings_kn: z.string().max(1000),
    deity_en: translation(),
    history_en: translation(20000),
    timings_en: translation(1000),
    deity_hi: translation(),
    history_hi: translation(20000),
    timings_hi: translation(1000),
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
    title_en: translation(),
    body_en: translation(20000),
    title_hi: translation(),
    body_hi: translation(20000),
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
    org_en: translation(),
    org_hi: translation(),
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
    title_en: translation(),
    description_en: translation(20000),
    title_hi: translation(),
    description_hi: translation(20000),
    status: z.enum(["pending", "approved", "rejected"]),
    is_seed: bool,
  }),
  liveblogs: z.object({
    slug,
    title_kn: title,
    summary_kn: body,
    title_en: translation(),
    summary_en: translation(20000),
    title_hi: translation(),
    summary_hi: translation(20000),
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
      title_en: translation(),
      description_en: translation(20000),
      title_hi: translation(),
      description_hi: translation(20000),
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
      title_en: translation(),
      title_hi: translation(),
      cover_url: image,
      slides: jsonArray(
        z.object({
          image,
          text: title,
          text_en: z.string().max(300).optional(),
          text_hi: z.string().max(300).optional(),
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
      question_en: translation(),
      question_hi: translation(),
      options: jsonArray(z.string().min(1).max(200)).pipe(
        z.array(z.string()).min(2).max(8),
      ),
      // Translated option lists may be left empty; PollCard only uses one when its
      // length matches the Kannada list, so a partial translation is ignored
      // rather than mismatching the votes it labels.
      options_en: jsonArray(z.string().max(200)).pipe(
        z.array(z.string()).max(8),
      ),
      options_hi: jsonArray(z.string().max(200)).pipe(
        z.array(z.string()).max(8),
      ),
      ends_at: time,
      status: z.enum(["draft", "active", "closed"]),
      is_seed: bool,
    })
    .refine((value) => !!value.ends_at),
  quizzes: z.object({
    slug,
    title_kn: title,
    title_en: translation(),
    title_hi: translation(),
    questions: jsonArray(
      z
        .object({
          question: title,
          question_en: z.string().max(300).optional(),
          question_hi: z.string().max(300).optional(),
          options: z.array(z.string().min(1)).min(2).max(6),
          options_en: z.array(z.string().max(300)).max(6).optional(),
          options_hi: z.array(z.string().max(300)).max(6).optional(),
          answer: number.int().min(0),
          explanation: title,
          explanation_en: z.string().max(300).optional(),
          explanation_hi: z.string().max(300).optional(),
        })
        .refine((question) => question.answer < question.options.length),
    ),
    status: z.enum(["draft", "published"]),
    is_seed: bool,
  }),
  reservoir_readings: z.object({
    reservoir_slug: slug,
    name_kn: title,
    name_en: translation(),
    name_hi: translation(),
    reading_date: z.iso.date(),
    full_level_m: number.nonnegative(),
    level_m: number.nonnegative(),
    storage_pct: number.min(0).max(100),
    inflow_cusecs: number.nonnegative(),
    outflow_cusecs: number.nonnegative(),
    source: title,
    source_en: translation(),
    source_hi: translation(),
    is_seed: bool,
  }),
  market_rates: z.object({
    rate_date: z.iso.date(),
    kind: z.enum(["gold22", "gold24", "silver", "petrol", "diesel"]),
    place_id: nullableId,
    value: number.nonnegative(),
    unit: title,
    unit_en: translation(),
    unit_hi: translation(),
    source: title,
    source_en: translation(),
    source_hi: translation(),
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
const standard = [
  f("slug", kn.slug),
  f("title_kn", kn.title),
  f("title_en", "English title"),
  f("title_hi", "Hindi title"),
];
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
      f("alt_en", "English alt"),
      f("alt_hi", "Hindi alt"),
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
  business_ads: {
    title: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು",
    permission: "ads.manage",
    fields: [
      f("status", kn.status, "select", [
        "pending",
        "approved",
        "paused",
        "rejected",
      ]),
      f("payment_status", "ಪಾವತಿ / Payment", "select", [
        "unpaid",
        "paid",
        "waived",
      ]),
      f("amount", "ಮೊತ್ತ (₹) / Amount", "number"),
      f("payment_ref", "ರಸೀದಿ / Receipt reference"),
      f("name_kn", kn.name),
      f("name_en", "English name"),
      f("name_hi", "Hindi name"),
      f("slug", kn.slug),
      f("category", t.contentType, "select", [...businessCategories]),
      f("offer_kn", "ಜಾಹೀರಾತಿನ ಸಂದೇಶ (160)"),
      f("offer_en", "English offer"),
      f("offer_hi", "Hindi offer"),
      f("image_url", t.image),
      f("phone", "ಫೋನ್ / Phone"),
      f("whatsapp", "WhatsApp"),
      f("website", "Website (https://)"),
      f("address_kn", "ವಿಳಾಸ / ಊರು"),
      f("place_id", kn.place),
      f("target_places", t.places + " (ಖಾಲಿ = ಎಲ್ಲೆಡೆ)", "ids"),
      f("starts_at", t.start, "datetime-local"),
      f("ends_at", t.end, "datetime-local"),
      f("priority", t.priority, "number"),
      f("weight", t.weight, "number"),
      f("contact_name", "ಅರ್ಜಿದಾರರು / Applicant"),
      f("contact_email", kn.email),
      f("contact_phone", "Applicant phone"),
      f("requested_formats", "Requested formats", "list"),
      f("message", kn.message, "textarea"),
      f("review_note", "ಪರಿಶೀಲನಾ ಟಿಪ್ಪಣಿ / Review note", "textarea"),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
  tags: {
    title: t.tags,
    permission: "content.edit",
    fields: [
      f("slug", kn.slug),
      f("name_kn", kn.title),
      f("name_en", "English"),
      f("name_hi", "Hindi"),
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
      f("name_hi", "Hindi"),
      f("district", t.district),
      f("lat", t.latitude, "number"),
      f("lng", t.longitude, "number"),
      f("is_district", t.district, "checkbox"),
      f("show_in_weather", t.weather, "checkbox"),
      f("show_in_district_news", t.showInDistrictNews, "checkbox"),
      f("sort_order", t.order, "number"),
      f("cover_url", t.image),
      f("description_kn", kn.summary, "textarea"),
      f("description_en", "English description", "textarea"),
      f("description_hi", "Hindi description", "textarea"),
    ],
  },
  authors: {
    title: t.authors,
    permission: "content.edit",
    fields: [
      f("slug", kn.slug),
      f("name_kn", kn.name),
      f("name_en", "English name"),
      f("name_hi", "Hindi name"),
      f("role_kn", kn.status),
      f("role_en", "English role"),
      f("role_hi", "Hindi role"),
      f("bio_kn", kn.summary, "textarea"),
      f("bio_en", "English bio", "textarea"),
      f("bio_hi", "Hindi bio", "textarea"),
      f("credentials_kn", t.credentials, "textarea"),
      f("credentials_en", "English credentials", "textarea"),
      f("credentials_hi", "Hindi credentials", "textarea"),
      f("is_active", t.enabled, "checkbox"),
    ],
  },
  topics: {
    title: t.topics,
    permission: "content.edit",
    fields: [
      ...standard,
      f("intro_kn", kn.summary, "textarea"),
      f("intro_en", "English intro", "textarea"),
      f("intro_hi", "Hindi intro", "textarea"),
      f("cover_url", kn.link),
      f("key_facts", t.keyFacts, "list"),
      f("key_facts_en", t.keyFacts + " (English)", "list"),
      f("key_facts_hi", t.keyFacts + " (हिंदी)", "list"),
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
      f("label_en", "English label"),
      f("label_hi", "Hindi label"),
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
      f("description_en", "English description", "textarea"),
      f("description_hi", "Hindi description", "textarea"),
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
      f("title_en", "English title"),
      f("title_hi", "Hindi title"),
      f("kind", t.contentType, "select", [
        "parva",
        "tithi",
        "festival",
        "note",
      ]),
      f("description_kn", kn.summary, "textarea"),
      f("description_en", "English description", "textarea"),
      f("description_hi", "Hindi description", "textarea"),
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
      f("name_hi", "Hindi"),
      f("place_id", kn.place),
      f("deity_kn", t.deity),
      f("deity_en", "English deity"),
      f("deity_hi", "Hindi deity"),
      f("history_kn", kn.body, "textarea"),
      f("history_en", "English history", "textarea"),
      f("history_hi", "Hindi history", "textarea"),
      f("timings_kn", t.timings),
      f("timings_en", "English timings"),
      f("timings_hi", "Hindi timings"),
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
      f("body_en", "English body", "textarea"),
      f("body_hi", "Hindi body", "textarea"),
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
      f("org_en", t.organisation + " (English)"),
      f("org_hi", t.organisation + " (हिंदी)"),
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
      f("description_en", "English description", "textarea"),
      f("description_hi", "Hindi description", "textarea"),
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
      f("summary_en", "English summary", "textarea"),
      f("summary_hi", "Hindi summary", "textarea"),
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
      f("description_en", "English description", "textarea"),
      f("description_hi", "Hindi description", "textarea"),
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
      f("question_en", kn.title + " (English)"),
      f("question_hi", kn.title + " (हिंदी)"),
      f("options", t.options, "list"),
      f("options_en", t.options + " (English)", "list"),
      f("options_hi", t.options + " (हिंदी)", "list"),
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
      f("name_en", "English name"),
      f("name_hi", "Hindi name"),
      f("reading_date", kn.eventDate, "date"),
      f("full_level_m", t.fullLevel, "number"),
      f("level_m", t.currentLevel, "number"),
      f("storage_pct", t.storage, "number"),
      f("inflow_cusecs", t.inflow, "number"),
      f("outflow_cusecs", t.outflow, "number"),
      f("source", t.source),
      f("source_en", t.source + " (English)"),
      f("source_hi", t.source + " (हिंदी)"),
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
      f("unit_en", t.unit + " (English)"),
      f("unit_hi", t.unit + " (हिंदी)"),
      f("source", t.source),
      f("source_en", t.source + " (English)"),
      f("source_hi", t.source + " (हिंदी)"),
      f("is_seed", t.sample, "checkbox"),
    ],
  },
};
