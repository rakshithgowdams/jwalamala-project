import { z } from "zod";
import type { NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  readJson,
  sameOrigin,
  privateJson,
  limitRequest,
} from "@/lib/v4/server";
import { getSetting } from "@/lib/v4/settings";
import {
  commentSettingsSchema,
  defaultComments,
  containsBlockedWord,
} from "@/lib/v4/comments";
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("post");
  if (!z.uuid().safeParse(id).success) return privateJson({ rows: [] });
  const db = getAdminClient();
  if (!db) return privateJson({ rows: [] });
  const config = commentSettingsSchema
    .catch(defaultComments)
    .parse((await getSetting("comments")) || defaultComments);
  if (!config.enabled) return privateJson({ rows: [] });
  const { data: post } = await db
    .from("posts")
    .select(
      "status,allow_comments,published_at,embargo_until,early_access_until",
    )
    .eq("id", id)
    .maybeSingle();
  if (
    !post?.allow_comments ||
    post.status !== "published" ||
    Date.parse(post.published_at) > Date.now() ||
    (post.embargo_until && Date.parse(post.embargo_until) > Date.now()) ||
    (post.early_access_until &&
      Date.parse(post.early_access_until) > Date.now())
  )
    return privateJson({ rows: [] });
  const { data, error } = await db.rpc("public_post_comments", { target: id });
  return privateJson({ rows: error ? [] : data || [] });
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  const session = await getServerClient(),
    db = getAdminClient();
  if (!session || !db) return privateJson({ error: "unavailable" }, 503);
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return privateJson({ error: "login" }, 401);
  try {
    const p = z
      .object({ post_id: z.uuid(), body: z.string().trim().min(3).max(2000) })
      .parse(await readJson(request));
    const config = commentSettingsSchema
      .catch(defaultComments)
      .parse((await getSetting("comments")) || defaultComments);
    if (!config.enabled) return privateJson({ error: "disabled" }, 403);
    if (!(await limitRequest("comment:" + user.id, 1, config.slow_seconds)))
      return privateJson({ error: "slow" }, 429);
    const { data: profile } = await session
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();
    const { error } = await db.rpc("submit_post_comment", {
      target: p.post_id,
      actor: user.id,
      display_name: (profile?.full_name || "ಓದುಗ").slice(0, 100),
      body: p.body,
      flagged: containsBlockedWord(p.body, config.blocked_words),
    });
    return privateJson({ ok: !error }, error ? 400 : 201);
  } catch {
    return privateJson({ error: "invalid" }, 400);
  }
}
