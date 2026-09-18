import type { NextRequest } from "next/server";
import { pulseSchema } from "@/lib/analytics/schema";
import {
  sameOrigin,
  readJson,
  privateJson,
  requestIdentity,
  digest,
  limitRequest,
} from "@/lib/v4/server";
import { getAdminClient } from "@/lib/supabase/admin";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({}, 403);
  if (request.headers.get("dnt") === "1") return privateJson({ ok: true });
  try {
    const parsed = pulseSchema.safeParse(await readJson(request));
    if (!parsed.success) return privateJson({}, 400);
    const identity = await requestIdentity(request),
      db = getAdminClient();
    if (!identity || !db) return privateJson({}, 503);
    if (!(await limitRequest("pulse-ip:" + identity.ipHash, 1500)))
      return privateJson({}, 429);
    const { session, ...payload } = parsed.data;
    const day = new Date().toISOString().slice(0, 10),
      session_hash = digest(process.env.IP_HASH_SECRET + day + session);
    const { error } = await db.rpc("record_v4_pulse", {
      payload: { ...payload, session_hash },
    });
    return privateJson({ ok: !error }, error ? 503 : 200);
  } catch {
    return privateJson({}, 400);
  }
}
