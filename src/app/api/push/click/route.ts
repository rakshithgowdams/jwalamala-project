import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { readJson, sameOrigin, privateJson } from "@/lib/v4/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  try {
    const { token } = z
      .object({ token: z.uuid() })
      .parse(await readJson(request, 1000));
    const db = getAdminClient();
    if (!db) return privateJson({ error: "unavailable" }, 503);
    const { error } = await db.rpc("record_push_click", { token });
    return privateJson({ ok: !error }, error ? 400 : 200);
  } catch {
    return privateJson({ error: "invalid" }, 400);
  }
}
