"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { assignmentSchema, storyStates } from "@/lib/v4/workflow";
import { v4 as t } from "@/content/strings.kn";
export async function saveAssignment(input: unknown) {
  const { db } = await requirePermission("content.edit"),
    parsed = assignmentSchema.safeParse(input);
  if (!parsed.success) return { error: t.failed };
  const { id, ...fields } = parsed.data;
  const result = id
    ? await db.from("story_assignments").update(fields).eq("id", id)
    : await db.from("story_assignments").insert(fields);
  if (result.error) return { error: t.failed };
  revalidatePath("/admin/desk");
  return { ok: true };
}
export async function moveAssignment(id: string, status: string) {
  const { db } = await requirePermission(
    ["approved", "scheduled", "published", "updated"].includes(status)
      ? "content.publish"
      : "content.edit",
  );
  if (
    !z.uuid().safeParse(id).success ||
    !z.enum(storyStates).safeParse(status).success
  )
    return { error: t.failed };
  const { error } = await db
    .from("story_assignments")
    .update({ status })
    .eq("id", id);
  if (error) return { error: t.failed };
  revalidatePath("/admin/desk");
  return { ok: true };
}
export async function addReviewComment(
  postId: string,
  body: string,
  paragraph: string,
) {
  const { db, user } = await requirePermission("content.edit");
  const parsed = z
    .object({
      post_id: z.uuid(),
      body: z.string().trim().min(1).max(3000),
      paragraph_index: z
        .union([z.literal(""), z.coerce.number().int().min(0).max(10000)])
        .transform((v) => (v === "" ? null : v)),
    })
    .safeParse({ post_id: postId, body, paragraph_index: paragraph });
  if (!parsed.success) return { error: t.failed };
  const { error } = await db
    .from("story_comments")
    .insert({ ...parsed.data, author_id: user.id });
  if (error) return { error: t.failed };
  revalidatePath("/admin/posts/" + postId);
  return { ok: true };
}
export async function restoreVersion(id: string) {
  const { db } = await requirePermission("content.edit");
  if (!z.uuid().safeParse(id).success) return { error: t.failed };
  const { error } = await db.rpc("restore_v4_version", { version_id: id });
  if (error) return { error: t.failed };
  revalidatePath("/admin/posts", "layout");
  return { ok: true };
}

export async function resolveReviewComment(id: string, resolved: boolean) {
  const { db } = await requirePermission("content.edit");
  if (!z.uuid().safeParse(id).success || typeof resolved !== "boolean")
    return { error: t.failed };
  const { error } = await db
    .from("story_comments")
    .update({ resolved })
    .eq("id", id);
  if (error) return { error: t.failed };
  revalidatePath("/admin/posts", "layout");
  return { ok: true };
}
