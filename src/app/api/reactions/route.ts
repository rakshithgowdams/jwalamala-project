import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { getServerClient } from "@/lib/supabase/server";
import { reactionSchema } from "@/lib/v4/engagement";
import {
  sameOrigin,
  readJson,
  requestIdentity,
  limitRequest,
  privateJson,
} from "@/lib/v4/server";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const parsed = reactionSchema.safeParse(await readJson(request));
    if (!parsed.success) return privateJson({ error: "validation" }, 400);
    const db = getAdminClient(),
      identity = await requestIdentity(request);
    if (!db || !identity) return privateJson({ error: "unavailable" }, 503);
    if (!(await limitRequest("reaction:" + identity.ipHash, 60)))
      return privateJson({ error: "rate" }, 429);
    const { data: post } = await db
      .from("posts")
      .select("id,embargo_until,early_access_until")
      .eq("id", parsed.data.post_id)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();
    if (
      !post ||
      (post.embargo_until && Date.parse(post.embargo_until) > Date.now()) ||
      (post.early_access_until &&
        Date.parse(post.early_access_until) > Date.now())
    )
      return privateJson({ error: "post" }, 404);
    const auth = await getServerClient(),
      user = auth ? (await auth.auth.getUser()).data.user : null;
    const { error } = await db.from("reactions").insert({
      ...parsed.data,
      device_hash: identity.deviceHash,
      user_id: user?.id || null,
    });
    if (error) return privateJson({ error: "already-reacted" }, 409);
    const response = privateJson({ ok: true });
    response.cookies.set("jwalamala-device", identity.cookie, {
      httpOnly: true,
      secure: request.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 31536000,
    });
    return response;
  } catch {
    return privateJson({ error: "request" }, 400);
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("post");
  if (!z.uuid().safeParse(id).success) return privateJson({ counts: [] });
  const db = getAdminClient();
  if (!db) return privateJson({ counts: [] });
  const { data, error } = await db.rpc("public_reaction_counts", {
    target: id,
  });
  return privateJson({ counts: error ? [] : data || [] });
}
