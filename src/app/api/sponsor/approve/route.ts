import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { readJson, sameOrigin, privateJson, digest } from "@/lib/v4/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  try {
    const { token } = z
      .object({ token: z.string().regex(/^[0-9a-f]{64}$/) })
      .parse(await readJson(request, 1000));
    const db = getAdminClient();
    if (!db) return privateJson({ error: "unavailable" }, 503);
    const { data, error } = await db.rpc("approve_sponsor_review", {
      token: digest(token),
    });
    return privateJson(
      { ok: data === true },
      error || data !== true ? 409 : 200,
    );
  } catch {
    return privateJson({ error: "invalid" }, 400);
  }
}
