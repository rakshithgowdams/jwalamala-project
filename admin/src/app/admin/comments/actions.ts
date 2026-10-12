"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { commentSettingsSchema } from "@/lib/v4/comments";
import { getUiStrings } from "@/lib/i18n/server";
import type { Tri } from "@/lib/i18n/strings";
import { revalidatePath } from "next/cache";
const notSaved: Tri = {
  en: "Could not save.",
  kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
  hi: "सहेजा नहीं जा सका।",
};
const failed: Tri = { en: "Error", kn: "ದೋಷ", hi: "त्रुटि" };
export async function moderateComment(id: string, status: string) {
  const { db } = await requirePermission("community.manage");
  const { tr } = await getUiStrings();
  if (
    !z.uuid().safeParse(id).success ||
    !["approved", "rejected"].includes(status)
  )
    return {
      error: tr({
        en: "Check the details.",
        kn: "ವಿವರ ಪರಿಶೀಲಿಸಿ.",
        hi: "विवरण जाँचें।",
      }),
    };
  const { error } = await db
    .from("post_comments")
    .update({ status })
    .eq("id", id);
  revalidatePath("/admin/comments");
  return error ? { error: tr(notSaved) } : { ok: true };
}
export async function blockCommenter(id: string) {
  const { db } = await requirePermission("community.manage");
  const { tr } = await getUiStrings();
  if (!z.uuid().safeParse(id).success) return { error: tr(failed) };
  const { error } = await db
    .from("comment_blocks")
    .upsert({ user_id: id, blocked: true });
  revalidatePath("/admin/comments");
  return error ? { error: tr(notSaved) } : { ok: true };
}
export async function saveComments(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const { tr } = await getUiStrings();
  const p = commentSettingsSchema.safeParse(input);
  if (!p.success) return { error: tr(failed) };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "comments", value: p.data });
  revalidatePath("/", "layout");
  return error ? { error: tr(notSaved) } : { ok: true };
}
