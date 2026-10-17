import { z } from "zod";

export const businessCategories = [
  "jewellery",
  "textiles",
  "sweets",
  "grocery",
  "restaurant",
  "health",
  "education",
  "services",
  "electronics",
  "travel",
  "real_estate",
  "other",
] as const;
export type BusinessCategory = (typeof businessCategories)[number];

export const businessAdFormats = [
  "shop_card",
  "banner",
  "sponsored_article",
] as const;

/** The public face of a live ad, exactly what list_business_ads() returns. */
export type BusinessAd = {
  id: string;
  slug: string;
  name_kn: string;
  name_en: string;
  name_hi: string;
  category: BusinessCategory;
  offer_kn: string;
  offer_en: string;
  offer_hi: string;
  image_url: string | null;
  phone: string;
  whatsapp: string;
  website: string | null;
  address_kn: string;
  place_id: string | null;
  target_places: string[];
  ends_at: string;
  priority: number;
  weight: number;
};
export type BusinessAdView = BusinessAd & {
  place?: { name_kn: string; name_en: string; name_hi?: string } | null;
  district?: string;
};

const phone = z
  .string()
  .trim()
  .regex(/^(\+?[0-9][0-9 -]{7,19})?$/);
const optionalHttps = z
  .union([
    z.literal(""),
    z
      .url()
      .max(500)
      .refine((value) => new URL(value).protocol === "https:"),
  ])
  .default("");

export const businessAdApplicationSchema = z.object({
  name_kn: z.string().trim().min(1).max(150),
  category: z.enum(businessCategories),
  district_id: z.uuid(),
  town: z.string().trim().max(150).default(""),
  offer_kn: z.string().trim().min(1).max(160),
  phone: phone.min(8),
  whatsapp: phone.default(""),
  website: optionalHttps,
  contact_name: z.string().trim().min(1).max(100),
  contact_email: z.email().max(254),
  formats: z.array(z.enum(businessAdFormats)).min(1).max(3),
  duration: z.enum(["week", "month", "quarter"]),
  start_date: z.iso.date(),
  message: z.string().trim().max(2000).default(""),
  policy: z.literal(true),
  token: z.string().trim().min(1).max(2048),
  website_url: z.literal("").optional(),
});
export type BusinessAdApplication = z.infer<typeof businessAdApplicationSchema>;

export type BusinessAdState =
  | "live"
  | "pending"
  | "paused"
  | "rejected"
  | "unpaid"
  | "scheduled"
  | "expired"
  | "undated";
/** Mirrors list_business_ads(), so staff can see why an ad is or is not running. */
export function businessAdState(
  row: {
    status: string;
    payment_status: string;
    starts_at: string | null;
    ends_at: string | null;
  },
  now = Date.now(),
): BusinessAdState {
  if (row.status === "pending") return "pending";
  if (row.status === "paused") return "paused";
  if (row.status === "rejected") return "rejected";
  if (!row.starts_at || !row.ends_at) return "undated";
  if (row.payment_status === "unpaid") return "unpaid";
  if (Date.parse(row.starts_at) > now) return "scheduled";
  if (Date.parse(row.ends_at) <= now) return "expired";
  return "live";
}

/** Digits a dialler or wa.me accepts; a bare 10-digit number is an Indian mobile. */
export function dialDigits(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? "91" + digits : digits;
}
export const telHref = (value: string) =>
  value ? "tel:+" + dialDigits(value) : "";
export const whatsappHref = (value: string) =>
  value ? "https://wa.me/" + dialDigits(value) : "";

/**
 * An untargeted ad runs everywhere; a targeted one only on its districts' pages,
 * so a Hassan shop never fills the statewide home page. Within that, editor
 * priority wins, a shop located in the district comes next, and weight decides
 * the rotation among equals.
 */
export function pickBusinessAds(
  ads: BusinessAdView[],
  {
    districtId,
    district,
    count,
    random = Math.random,
  }: {
    districtId?: string;
    district?: string;
    count: number;
    random?: () => number;
  },
) {
  return ads
    .filter((ad) =>
      districtId
        ? !ad.target_places.length || ad.target_places.includes(districtId)
        : !ad.target_places.length,
    )
    .map((ad) => ({
      ad,
      local: !!district && ad.district === district,
      draw: -Math.log(Math.max(random(), 1e-6)) / Math.max(ad.weight, 1),
    }))
    .sort(
      (a, b) =>
        b.ad.priority - a.ad.priority ||
        Number(b.local) - Number(a.local) ||
        a.draw - b.draw,
    )
    .slice(0, count)
    .map(({ ad }) => ad);
}
