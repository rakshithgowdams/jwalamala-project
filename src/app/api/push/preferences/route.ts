import { getServerClient } from "@/lib/supabase/server";
import { sameOrigin, readJson, privateJson } from "@/lib/v4/server";
import { pushPreferencesSchema, defaultPush } from "@/lib/push/schema";
export async function GET() {
  const db = await getServerClient();
  if (!db) return privateJson({ error: "unavailable" }, 503);
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return privateJson({ error: "unauthorized" }, 401);
  const { data, error } = await db
    .from("push_preferences")
    .select("enabled,topics,quiet_start,quiet_end,daily_cap,breaking_override")
    .eq("user_id", user.id)
    .maybeSingle();
  return error
    ? privateJson({ error: "unavailable" }, 503)
    : privateJson(data || defaultPush);
}
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  const db = await getServerClient();
  if (!db) return privateJson({ error: "unavailable" }, 503);
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return privateJson({ error: "unauthorized" }, 401);
  try {
    const p = pushPreferencesSchema.parse(await readJson(request));
    const { error } = await db
      .from("push_preferences")
      .upsert({ ...p, user_id: user.id });
    return privateJson({ ok: !error }, error ? 400 : 200);
  } catch {
    return privateJson({ error: "invalid" }, 400);
  }
}
