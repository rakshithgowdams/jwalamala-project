"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { jainRulesSchema } from "@/lib/jain/times";
import { revalidatePath } from "next/cache";
export async function saveJainTimes(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const parsed = jainRulesSchema.safeParse(input);
  if (!parsed.success)
    return { error: "Check rule names, offsets and advisor approval." };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "jain_times", value: parsed.data });
  revalidatePath("/", "layout");
  return { error: error ? "Save failed" : "" };
}
