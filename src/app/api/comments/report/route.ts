import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sameOrigin,
  readJson,
  privateJson,
  limitRequest,
} from "@/lib/v4/server";
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
      .object({ id: z.uuid(), reason: z.string().trim().min(3).max(1000) })
      .parse(await readJson(request));
    if (!(await limitRequest("comment-report:" + user.id, 20)))
      return privateJson({ error: "rate" }, 429);
    const { error } = await db
      .from("comment_reports")
      .upsert(
        { comment_id: p.id, user_id: user.id, reason: p.reason },
        { onConflict: "comment_id,user_id" },
      );
    return privateJson({ ok: !error }, error ? 400 : 200);
  } catch {
    return privateJson({ error: "invalid" }, 400);
  }
}
