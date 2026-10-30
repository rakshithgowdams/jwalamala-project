import type { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sameOrigin,
  readJson,
  requestIdentity,
  privateJson,
} from "@/lib/v4/server";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({}, 403);
  try {
    if (/bot|crawler|spider/i.test(request.headers.get("user-agent") || ""))
      return privateJson({ ok: true });
    const { id, kind } = z
      .object({ id: z.uuid(), kind: z.enum(["impression", "click"]) })
      .parse(await readJson(request));
    const db = getAdminClient(),
      identity = await requestIdentity(request);
    if (!db || !identity) return privateJson({}, 503);
    // The database deduplicates per device and only counts live, paid ads.
    const { error } = await db.rpc("record_business_ad_event", {
      ad: id,
      session: identity.deviceHash,
      kind,
    });
    return privateJson({ ok: !error }, error ? 503 : 200);
  } catch {
    return privateJson({}, 400);
  }
}
