import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { sameOrigin, readJson, privateJson, digest } from "@/lib/v4/server";
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let token = url.searchParams.get("token");
    if (!token) {
      if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
      token = z
        .object({ token: z.string() })
        .parse(await readJson(request)).token;
    }
    if (!/^[a-f0-9]{64}$/.test(token))
      return privateJson({ error: "token" }, 400);
    const db = getAdminClient();
    if (!db) return privateJson({ error: "unavailable" }, 503);
    const { error } = await db
      .from("newsletter_subscribers")
      .update({ status: "unsubscribed" })
      .eq("unsubscribe_hash", digest(token));
    return error
      ? privateJson({ error: "unavailable" }, 503)
      : privateJson({ ok: true });
  } catch {
    return privateJson({ error: "request" }, 400);
  }
}
