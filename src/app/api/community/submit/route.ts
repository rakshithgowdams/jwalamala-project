import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { communitySubmissionSchema } from "@/lib/v4/submissions";
import {
  sameOrigin,
  readJson,
  requestIdentity,
  limitRequest,
  checkCaptcha,
  privateJson,
} from "@/lib/v4/server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const parsed = communitySubmissionSchema.safeParse(await readJson(request));
    if (!parsed.success) return privateJson({ error: "validation" }, 400);
    const db = getAdminClient(),
      identity = await requestIdentity(request);
    if (!db || !identity) return privateJson({ error: "unavailable" }, 503);
    if (!(await limitRequest("community:" + identity.ipHash, 6)))
      return privateJson({ error: "rate-limit" }, 429);
    if (!(await checkCaptcha(parsed.data.token, request.nextUrl.hostname)))
      return privateJson({ error: "verification" }, 400);
    const { token: _token, website: _website, ...input } = parsed.data;
    void _token;
    void _website;
    const { error } = await db.from("community_submissions").insert({
      kind: input.kind,
      payload: input,
      status: "pending",
      ip_hash: identity.ipHash,
    });
    if (error) return privateJson({ error: "unavailable" }, 503);
    return privateJson({ ok: true }, 201);
  } catch {
    return privateJson({ error: "invalid-request" }, 400);
  }
}
