"use server";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { getAdminClient } from "@/lib/supabase/admin";
import { adSettingsSchema, adSlotSchema } from "@/lib/ads/schema";
import { getUiStrings } from "@/lib/i18n/server";
export async function saveAdSettings(input: unknown) {
  await requirePermission("ads.manage");
  const { v4: t } = await getUiStrings();
  const parsed = adSettingsSchema.safeParse(input),
    db = getAdminClient();
  if (!parsed.success || !db) return { error: t.failed };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "ads", value: parsed.data });
  if (error) return { error: t.failed };
  revalidatePath("/", "layout");
  return { ok: true };
}
export async function saveAdSlot(input: unknown) {
  const { db } = await requirePermission("ads.manage"),
    parsed = adSlotSchema.safeParse(input);
  const { v4: t } = await getUiStrings();
  if (!parsed.success) return { error: t.failed };
  const { slot_key, ...fields } = parsed.data;
  const { error } = await db
    .from("ad_slots")
    .update(fields)
    .eq("slot_key", slot_key);
  if (error) return { error: t.failed };
  revalidatePath("/admin/ad-settings");
  return { ok: true };
}
