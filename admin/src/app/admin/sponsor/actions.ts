"use server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import { digest } from "@/lib/v4/server";
import { getUiStrings } from "@/lib/i18n/server";
import { site } from "@/config/site";
export async function createSponsorReview(id: string) {
  const { user } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
  if (!z.uuid().safeParse(id).success)
    return { error: tr({ en: "Error", kn: "ದೋಷ", hi: "त्रुटि" }) };
  const db = getAdminClient();
  if (!db)
    return {
      error: tr({
        en: "Service unavailable.",
        kn: "ಸೇವೆ ಲಭ್ಯವಿಲ್ಲ.",
        hi: "सेवा उपलब्ध नहीं है।",
      }),
    };
  const { data: p } = await db.from("posts").select("*").eq("id", id).single();
  if (!p?.sponsor_name)
    return {
      error: tr({
        en: "First save a draft with the sponsor's name.",
        kn: "ಮೊದಲು ಪ್ರಾಯೋಜಕರ ಹೆಸರಿನೊಂದಿಗೆ ಕರಡು ಉಳಿಸಿ.",
        hi: "पहले प्रायोजक के नाम के साथ ड्राफ़्ट सहेजें।",
      }),
    };
  const { data: hash, error } = await db.rpc("sponsor_content_hash", { p });
  if (error)
    return {
      error: tr({
        en: "Could not prepare the review.",
        kn: "ಪರಿಶೀಲನೆ ಸಿದ್ಧವಾಗಲಿಲ್ಲ.",
        hi: "समीक्षा तैयार नहीं हो सकी।",
      }),
    };
  const token = randomBytes(32).toString("hex");
  const result = await db.from("sponsor_reviews").insert({
    post_id: id,
    token_hash: digest(token),
    content_hash: hash,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    created_by: user.id,
  });
  return result.error
    ? {
        error: tr({
          en: "Could not save.",
          kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
          hi: "सहेजा नहीं जा सका।",
        }),
      }
    : { url: site.url + "/review/" + token };
}
