"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { commentSettingsSchema } from "@/lib/v4/comments";
import { revalidatePath } from "next/cache";
export async function moderateComment(id: string, status: string) {
  const { db } = await requirePermission("community.manage");
  if (
    !z.uuid().safeParse(id).success ||
    !["approved", "rejected"].includes(status)
  )
    return { error: "ವಿವರ ಪರಿಶೀಲಿಸಿ." };
  const { error } = await db
    .from("post_comments")
    .update({ status })
    .eq("id", id);
  revalidatePath("/admin/comments");
  return error ? { error: "ಉಳಿಸಲಾಗಲಿಲ್ಲ." } : { ok: true };
}
export async function blockCommenter(id: string) {
  const { db } = await requirePermission("community.manage");
  if (!z.uuid().safeParse(id).success) return { error: "ದೋಷ" };
  const { error } = await db
    .from("comment_blocks")
    .upsert({ user_id: id, blocked: true });
  revalidatePath("/admin/comments");
  return error ? { error: "ಉಳಿಸಲಾಗಲಿಲ್ಲ." } : { ok: true };
}
export async function saveComments(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const p = commentSettingsSchema.safeParse(input);
  if (!p.success) return { error: "ದೋಷ" };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "comments", value: p.data });
  revalidatePath("/", "layout");
  return error ? { error: "ಉಳಿಸಲಾಗಲಿಲ್ಲ." } : { ok: true };
}
