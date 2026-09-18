"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import {
  providerControlSchema,
  roleControlSchema,
} from "@/lib/v4/control-schema";
import { v4 as t } from "@/content/strings.kn";
export async function saveProvider(input: unknown) {
  const { db } = await requirePermission("settings.manage"),
    parsed = providerControlSchema.safeParse(input);
  if (!parsed.success) return { error: t.failed };
  const { id, blocked_category_ids, ...fields } = parsed.data;
  const { data: existing } = await db
    .from("provider_settings")
    .select("options")
    .eq("id", id)
    .single();
  const { error } = await db
    .from("provider_settings")
    .update({
      ...fields,
      options: { ...(existing?.options || {}), blocked_category_ids },
    })
    .eq("id", id);
  if (error) return { error: t.failed };
  revalidatePath("/admin/providers");
  return { ok: true };
}
export async function saveRolePermission(input: unknown) {
  const { db } = await requirePermission("users.manage"),
    parsed = roleControlSchema.safeParse(input);
  if (!parsed.success) return { error: t.failed };
  const { error } = await db.from("role_permissions").upsert(parsed.data);
  if (error) return { error: t.failed };
  revalidatePath("/admin/roles");
  return { ok: true };
}
