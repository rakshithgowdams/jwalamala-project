"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requirePermission } from "@/lib/v4/permissions";
import { v4Schemas, v4Resources, type V4Resource } from "@/lib/v4/admin-schema";
import { kn, v4 as t } from "@/content/strings.kn";
import { cleanHtml } from "@/lib/utils/sanitize";
import { isHostedImage } from "@/lib/utils/images";
import { autoTranslateRows } from "@/lib/ai/autotranslate";
export async function saveV4(
  resource: V4Resource,
  id: string | null,
  input: unknown,
) {
  if (!Object.hasOwn(v4Schemas, resource)) return { error: kn.validation };
  const { db } = await requirePermission(v4Resources[resource].permission);
  if (id && !z.uuid().safeParse(id).success) return { error: kn.validation };
  const parsed = v4Schemas[resource].safeParse(input);
  if (!parsed.success) return { error: kn.validation };
  const payload: Record<string, unknown> = { ...parsed.data };
  const result = id
    ? await db.from(resource).update(payload).eq("id", id).select("id").single()
    : await db.from(resource).insert(payload).select("id").single();
  if (result.error) return { error: t.failed };
  const saved = String(result.data.id);
  // Drafts are not worth spending translation budget on; they will be saved again.
  // Labels feed cards, menus and listings, so they are filled before the editor
  // sees the response, while prose and jsonb payloads follow after it. Neither
  // call can fail the save: autoTranslateRows swallows everything.
  if (payload.status !== "draft") {
    await autoTranslateRows(resource, [saved], "short");
    after(() => autoTranslateRows(resource, [saved], "long"));
  }
  revalidatePath("/", "layout");
  return { id: saved };
}
const deletable: ReadonlySet<V4Resource> = new Set(["places"]);
export async function deleteV4(resource: V4Resource, id: string) {
  if (!deletable.has(resource)) return { error: kn.validation };
  const { db } = await requirePermission(v4Resources[resource].permission);
  if (!z.uuid().safeParse(id).success) return { error: kn.validation };
  const { error } = await db.from(resource).delete().eq("id", id);
  // 23503: still referenced by posts, basadis, notices or a reader's saved place.
  if (error)
    return { error: error.code === "23503" ? t.deleteInUse : t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function saveDistrictOrder(ids: string[]) {
  const { db } = await requirePermission(v4Resources.places.permission);
  if (
    !z.array(z.uuid()).min(1).max(200).safeParse(ids).success ||
    new Set(ids).size !== ids.length
  )
    return { error: kn.validation };
  // Steps of ten leave room to slot a new district in by hand from the editor.
  const results = await Promise.all(
    ids.map((id, i) =>
      db
        .from("places")
        .update({ sort_order: (i + 1) * 10 })
        .eq("id", id)
        .eq("is_district", true),
    ),
  );
  if (results.some((result) => result.error)) return { error: t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function saveRelationships(
  resource: "topics" | "series",
  id: string,
  postIds: string[],
) {
  const { db } = await requirePermission("content.edit");
  if (
    !z.uuid().safeParse(id).success ||
    !z.array(z.uuid()).max(200).safeParse(postIds).success ||
    new Set(postIds).size !== postIds.length
  )
    return { error: kn.validation };
  const { error } = await db.rpc("replace_v4_relationships", {
    kind: resource,
    parent_id: id,
    post_ids: postIds,
  });
  if (error) return { error: t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function mergeTags(sourceId: string, destinationId: string) {
  const { db } = await requirePermission("content.edit");
  if (
    !z.uuid().safeParse(sourceId).success ||
    !z.uuid().safeParse(destinationId).success ||
    sourceId === destinationId
  )
    return { error: kn.validation };
  const { error } = await db.rpc("merge_v4_tags", {
    source_id: sourceId,
    destination_id: destinationId,
  });
  if (error) return { error: t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}
const updateSchema = z.object({
  media: z
    .object({
      type: z.enum(["image", "video"]),
      url: z.string().max(2000),
      credit: z.string().trim().min(1).max(200),
    })
    .nullable()
    .optional(),
  liveblog_id: z.uuid(),
  id: z.uuid().optional(),
  body_html: z.string().min(1).max(12000),
  body_html_en: z.string().max(20000).default(""),
  body_html_hi: z.string().max(20000).default(""),
  is_key: z.boolean(),
  is_pinned: z.boolean(),
});
export async function saveLiveUpdate(input: unknown) {
  const { db, user } = await requirePermission("content.edit"),
    parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: kn.validation };
  if (parsed.data.media) {
    const media = parsed.data.media;
    if (
      media.type === "video"
        ? !/^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be|facebook\.com)\//.test(
            media.url,
          )
        : !isHostedImage(media.url)
    )
      return { error: kn.validation };
  }
  const payload = {
    ...parsed.data,
    body_html: cleanHtml(parsed.data.body_html),
    body_html_en: cleanHtml(parsed.data.body_html_en),
    body_html_hi: cleanHtml(parsed.data.body_html_hi),
    author_id: user.id,
    published_at: new Date().toISOString(),
  };
  const { data: blog } = await db
    .from("liveblogs")
    .select("is_live")
    .eq("id", payload.liveblog_id)
    .single();
  if (!blog?.is_live) return { error: t.ended };
  let saved = payload.id || "";
  if (payload.id) {
    const { error } = await db
      .from("liveblog_updates")
      .update({
        media: payload.media || null,
        body_html: payload.body_html,
        body_html_en: payload.body_html_en,
        body_html_hi: payload.body_html_hi,
        is_key: payload.is_key,
        is_pinned: payload.is_pinned,
      })
      .eq("id", payload.id)
      .eq("liveblog_id", payload.liveblog_id);
    if (error) return { error: t.failed };
  } else {
    const { data, error } = await db
      .from("liveblog_updates")
      .insert(payload)
      .select("id")
      .single();
    if (error) return { error: t.failed };
    saved = String(data.id);
  }
  // A live update is one block of prose, and live blogging is the most latency
  // sensitive thing here, so the translation always runs after the response.
  if (saved)
    after(() => autoTranslateRows("liveblog_updates", [saved], "long"));
  revalidatePath("/live", "layout");
  return { ok: true };
}
export async function endLiveBlog(id: string) {
  const { db } = await requirePermission("content.publish");
  if (!z.uuid().safeParse(id).success) return { error: kn.validation };
  const { error } = await db
    .from("liveblogs")
    .update({ is_live: false, ended_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: t.failed };
  revalidatePath("/live", "layout");
  return { ok: true };
}
export async function moderateSubmission(
  id: string,
  decision: "approved" | "rejected",
) {
  const { db } = await requirePermission("community.manage");
  if (
    !z.uuid().safeParse(id).success ||
    !["approved", "rejected"].includes(decision)
  )
    return { error: kn.validation };
  const { error } = await db.rpc("moderate_v4_submission", {
    submission_id: id,
    decision,
  });
  if (error) return { error: t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteLiveUpdate(id: string) {
  const { db } = await requirePermission("content.publish");
  if (!z.uuid().safeParse(id).success) return { error: kn.validation };
  const { error } = await db.from("liveblog_updates").delete().eq("id", id);
  revalidatePath("/live", "layout");
  return { error: error ? t.failed : "" };
}
