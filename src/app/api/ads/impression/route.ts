import { z } from "zod";
import { verifyAdToken } from "@/lib/ads/server";
import { sameOrigin, readJson, privateJson } from "@/lib/v4/server";
import { getAdminClient } from "@/lib/supabase/admin";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({}, 403);
  try {
    if (/bot|crawler|spider/i.test(request.headers.get("user-agent") || ""))
      return privateJson({ ok: true });
    const { token } = z
      .object({ token: z.string().max(2000) })
      .parse(await readJson(request));
    const payload = verifyAdToken(token),
      db = getAdminClient();
    if (!payload || !db) return privateJson({}, 400);
    const { error } = await db.rpc("record_ad_event", {
      ad: payload.id,
      slot: payload.slot,
      device: payload.device,
      session: payload.session,
      kind: "impression",
    });
    return privateJson({ ok: !error }, error ? 503 : 200);
  } catch {
    return privateJson({}, 400);
  }
}
