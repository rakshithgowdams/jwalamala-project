"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import { digest } from "@/lib/v4/server";
import { site } from "@/config/site";
export async function createSponsorReview(id: string) {
  const { user } = await requirePermission("content.edit");
  if (!z.uuid().safeParse(id).success) return { error: "ದೋಷ" };
  const db = getAdminClient();
  if (!db) return { error: "ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ." };
  const { data: p } = await db.from("posts").select("*").eq("id", id).single();
  if (!p?.sponsor_name)
    return { error: "ಮೊದಲು ಪ್ರಾಯೋಜಕರ ಹೆಸರಿನೊಂದಿಗೆ ಕರಡು ಉಳಿಸಿ." };
  const { data: hash, error } = await db.rpc("sponsor_content_hash", { p });
  if (error) return { error: "ಪರಿಶೀಲನೆ ಸಿದ್ಧವಾಗಲಿಲ್ಲ." };
  const token = randomBytes(32).toString("hex");
  const result = await db.from("sponsor_reviews").insert({
    post_id: id,
    token_hash: digest(token),
    content_hash: hash,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_by: user.id,
  });
  return result.error
    ? { error: "ಉಳಿಸಲಾಗಲಿಲ್ಲ." }
    : { url: site.url + "/review/" + token };
}
