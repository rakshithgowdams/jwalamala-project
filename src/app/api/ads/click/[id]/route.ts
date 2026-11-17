import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { verifyAdToken } from "@/lib/ads/server";
import { safeAdTarget } from "@/lib/ads/schema";
import { getAdminClient } from "@/lib/supabase/admin";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params,
    payload = verifyAdToken(request.nextUrl.searchParams.get("token") || ""),
    db = getAdminClient();
  if (!z.uuid().safeParse(id).success || !payload || payload.id !== id || !db)
    return new Response(null, { status: 404 });
  const { data: ad } = await db
      .from("ads")
      .select("target_url,is_active,campaign_id,starts_at,ends_at")
      .eq("id", id)
      .maybeSingle(),
    target = ad?.target_url ? safeAdTarget(ad.target_url) : null,
    now = Date.now();
  // A page left open past the end date must not keep sending readers to the offer.
  if (
    !target ||
    !ad?.is_active ||
    Date.parse(ad.starts_at) > now ||
    Date.parse(ad.ends_at) <= now
  )
    return new Response(null, { status: 404 });
  if (!/bot|crawler|spider/i.test(request.headers.get("user-agent") || ""))
    await db.rpc("record_ad_event", {
      ad: id,
      slot: payload.slot,
      device: payload.device,
      session: payload.session,
      kind: "click",
    });
  target.searchParams.set("utm_source", "jwalamala");
  target.searchParams.set("utm_medium", "banner");
  target.searchParams.set("utm_campaign", ad.campaign_id || id);
  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
