import type { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { businessAdApplicationSchema } from "@/lib/ads/business";
import {
  sameOrigin,
  readJson,
  requestIdentity,
  limitRequest,
  checkCaptcha,
  privateJson,
} from "@/lib/v4/server";

const months = { week: 0, month: 1, quarter: 3 } as const;

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const parsed = businessAdApplicationSchema.safeParse(
      await readJson(request),
    );
    if (!parsed.success) return privateJson({ error: "validation" }, 400);
    const db = getAdminClient(),
      identity = await requestIdentity(request);
    if (!db || !identity) return privateJson({ error: "unavailable" }, 503);
    if (!(await limitRequest("business-ad:" + identity.ipHash, 5)))
      return privateJson({ error: "rate-limit" }, 429);
    if (!(await checkCaptcha(parsed.data.token, request.nextUrl.hostname)))
      return privateJson({ error: "verification" }, 400);
    const input = parsed.data;
    const { data: district } = await db
      .from("places")
      .select("id")
      .eq("id", input.district_id)
      .eq("is_district", true)
      .maybeSingle();
    if (!district) return privateJson({ error: "validation" }, 400);
    const starts = new Date(input.start_date + "T00:00:00+05:30");
    const ends = new Date(starts);
    if (input.duration === "week") ends.setDate(ends.getDate() + 7);
    else ends.setMonth(ends.getMonth() + months[input.duration]);
    // Everything an applicant sends is a draft: staff verify the numbers, collect
    // artwork, record payment and only then approve.
    const { error } = await db.from("business_ads").insert({
      slug: "shop-" + randomUUID().replace(/-/g, "").slice(0, 12),
      name_kn: input.name_kn,
      category: input.category,
      offer_kn: input.offer_kn,
      phone: input.phone,
      whatsapp: input.whatsapp,
      website: input.website || null,
      address_kn: input.town,
      place_id: district.id,
      starts_at: starts.toISOString(),
      ends_at: ends.toISOString(),
      status: "pending",
      payment_status: "unpaid",
      contact_name: input.contact_name,
      contact_email: input.contact_email,
      contact_phone: input.phone,
      requested_formats: input.formats,
      message: input.message,
      policy_accepted_at: new Date().toISOString(),
      ip_hash: identity.ipHash,
    });
    if (error) return privateJson({ error: "unavailable" }, 503);
    return privateJson({ ok: true }, 201);
  } catch {
    return privateJson({ error: "invalid-request" }, 400);
  }
}
