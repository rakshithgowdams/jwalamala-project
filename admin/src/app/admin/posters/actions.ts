"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { posterRow, posterSchema } from "@/lib/ads/posters";
import { autoTranslateRows } from "@/lib/ai/autotranslate";
import { kn, v4 as t } from "@/content/strings.kn";

const id = z.uuid();

export async function savePoster(posterId: string | null, input: unknown) {
  const { db } = await requirePermission("ads.manage");
  if (posterId && !id.safeParse(posterId).success)
    return { error: kn.validation };
  const parsed = posterSchema.safeParse(input);
  if (!parsed.success) return { error: kn.validation };
  const row = posterRow(parsed.data);
  // Legacy banners ("any") stay with their own editor; this screen never rewrites them.
  const result = posterId
    ? await db
        .from("ads")
        .update(row)
        .eq("id", posterId)
        .neq("shape", "any")
        .select("id")
        .single()
    : await db.from("ads").insert(row).select("id").single();
  if (result.error) return { error: t.failed };
  const saved = String(result.data.id);
  await autoTranslateRows("ads", [saved], "short");
  revalidatePath("/admin/posters");
  return { id: saved };
}

export async function setPosterActive(posterId: string, active: boolean) {
  const { db } = await requirePermission("ads.manage");
  if (!id.safeParse(posterId).success) return { error: kn.validation };
  const { error } = await db
    .from("ads")
    .update({ is_active: active })
    .eq("id", posterId)
    .neq("shape", "any");
  if (error) return { error: t.failed };
  revalidatePath("/admin/posters");
  return { ok: true };
}

export async function deletePoster(posterId: string) {
  const { db } = await requirePermission("ads.manage");
  if (!id.safeParse(posterId).success) return { error: kn.validation };
  const { error } = await db
    .from("ads")
    .delete()
    .eq("id", posterId)
    .neq("shape", "any");
  if (error) return { error: t.failed };
  revalidatePath("/admin/posters");
  return { ok: true };
}
