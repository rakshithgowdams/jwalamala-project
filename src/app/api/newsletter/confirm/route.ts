import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { sameOrigin, readJson, privateJson, digest } from "@/lib/v4/server";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const { token } = z
      .object({ token: z.string().regex(/^[a-f0-9]{64}$/) })
      .parse(await readJson(request));
    const db = getAdminClient();
    if (!db) return privateJson({ error: "unavailable" }, 503);
    const { data, error } = await db
      .from("newsletter_subscribers")
      .update({ status: "active", confirmed_at: new Date().toISOString() })
      .eq("status", "pending")
      .eq("token_hash", digest(token))
      .gt("token_expires_at", new Date().toISOString())
      .select("id")
      .maybeSingle();
    return !error && data
      ? privateJson({ ok: true })
      : privateJson({ error: "expired" }, 400);
  } catch {
    return privateJson({ error: "request" }, 400);
  }
}
