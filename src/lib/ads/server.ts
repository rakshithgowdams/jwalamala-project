import { getServerClient } from "@/lib/supabase/server";
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/v4/settings";
import {
  adSettingsSchema,
  defaultAds,
  canonicalSlot,
  routeAllowsAds,
  type AdPick,
} from "./schema";
import { site } from "@/config/site";
export function adToken(payload: {
  id: string;
  slot: string;
  device: string;
  session: string;
  expires: number;
}) {
  const key = process.env.IP_HASH_SECRET;
  if (!key) throw Error("Missing signing key");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return body + "." + createHmac("sha256", key).update(body).digest("hex");
}
export function verifyAdToken(value: string) {
  try {
    const key = process.env.IP_HASH_SECRET;
    if (!key) return null;
    const [body, signature] = value.split(".");
    const expected = createHmac("sha256", key).update(body).digest("hex");
    if (
      !signature ||
      signature.length !== 64 ||
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
      return null;
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as {
      id: string;
      slot: string;
      device: string;
      session: string;
      expires: number;
    };
    return p.expires > Date.now() ? p : null;
  } catch {
    return null;
  }
}
export async function pickAd(
  placement: string,
  path: string,
  device: "mobile" | "desktop",
  session: string,
): Promise<AdPick> {
  if (!routeAllowsAds(path)) return { mode: "off" };
  const config = adSettingsSchema
    .catch(defaultAds)
    .parse((await getSetting("ads")) || defaultAds);
  if (!config.enabled) return { mode: "off" };
  const db = getAdminClient(),
    slotKey = canonicalSlot(placement);
  if (
    slotKey === "global_mobile_sticky" &&
    (!config.sticky_mobile_enabled || device !== "mobile")
  )
    return { mode: "off" };
  if (!db)
    return site.demo && config.test_mode ? { mode: "test" } : { mode: "off" };
  let sponsored = false;
  let categories: string[] = [],
    place: string | null = null;
  const parts = path.split("/").filter(Boolean);
  if (["news", "video"].includes(parts[0]) && parts[1]) {
    const { data: post } = await db
      .from("posts")
      .select(
        "hide_ads,sponsor_name,status,published_at,early_access_until,embargo_until,place_id,post_categories(category_id,categories(hide_ads))",
      )
      .eq("slug", parts[1])
      .maybeSingle();
    if (
      !post ||
      post.status !== "published" ||
      Date.parse(post.published_at) > Date.now() ||
      (post.early_access_until &&
        Date.parse(post.early_access_until) > Date.now()) ||
      (post.embargo_until && Date.parse(post.embargo_until) > Date.now()) ||
      post.hide_ads
    )
      return { mode: "off" };
    const relationships = post.post_categories as unknown as {
      category_id: string;
      categories: { hide_ads: boolean } | null;
    }[];
    if (relationships.some((r) => r.categories?.hide_ads))
      return { mode: "off" };
    sponsored = !!post.sponsor_name;
    categories = relationships.map((r) => r.category_id);
    place = post.place_id;
  } else if (parts[0] === "notices" && parts[1]) {
    const { data: n } = await db
      .from("notices")
      .select("type,status")
      .eq("slug", parts[1])
      .maybeSingle();
    if (!n || n.status !== "approved" || n.type === "shraddhanjali")
      return { mode: "off" };
  } else if (parts[0] === "category" && parts[1]) {
    const { data: c } = await db
      .from("categories")
      .select("id,hide_ads")
      .eq("slug", parts[1])
      .maybeSingle();
    if (!c || c.hide_ads) return { mode: "off" };
    categories = [c.id];
  } else if (parts[0] === "place" && parts[1]) {
    const { data: p } = await db
      .from("places")
      .select("id")
      .eq("slug", parts[1])
      .maybeSingle();
    place = p?.id || null;
  }
  if (!sponsored && !slotKey.includes("top")) {
    const sessionDb = await getServerClient();
    if (sessionDb) {
      const {
        data: { user },
      } = await sessionDb.auth.getUser();
      if (user) {
        const { data: member } = await sessionDb
          .from("supporters")
          .select("ad_light,valid_until")
          .eq("user_id", user.id)
          .maybeSingle();
        if (member?.ad_light && Date.parse(member.valid_until) > Date.now())
          return { mode: "off" };
      }
    }
  }
  const { data: slot } = await db
    .from("ad_slots")
    .select("*")
    .eq("slot_key", slotKey)
    .maybeSingle();
  if (!slot || !slot.enabled || slot.mode === "off") return { mode: "off" };
  if (slot.mode !== "google") {
    const { data, error } = await db.rpc("pick_manual_ad", {
      requested_slot: slotKey,
      page_type: parts[0] || "home",
      category_ids: categories,
      place_id: place,
      device_type: device,
    });
    const ad = Array.isArray(data) ? data[0] : data;
    if (!error && ad)
      return {
        mode: "manual",
        creative: {
          id: ad.id,
          image_url: ad.image_url,
          mobile_image_url: ad.mobile_image_url,
          alt_kn: ad.alt_kn,
          token: adToken({
            id: ad.id,
            slot: slotKey,
            device,
            session,
            expires: Date.now() + 3600000,
          }),
        },
      };
  }
  if (config.test_mode || site.demo) return { mode: "test" };
  if (
    slot.mode !== "manual" &&
    config.adsense_enabled &&
    config.adsense_client_id &&
    /^\d+$/.test(slot.adsense_slot_id) &&
    process.env.ADS_STRICT_CSP === "true"
  )
    return {
      mode: "google",
      client: config.adsense_client_id,
      slot: slot.adsense_slot_id,
      format: slot.adsense_format,
    };
  return { mode: "off" };
}
