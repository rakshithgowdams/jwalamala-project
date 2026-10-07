"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { revalidatePath } from "next/cache";
export async function saveSchedule(input: unknown) {
  const p = z
    .object({
      enabled: z.boolean(),
      hours: z
        .string()
        .transform((v) => v.split(",").map((s) => Number(s.trim())))
        .pipe(z.array(z.number().int().min(0).max(23)).min(1).max(4)),
      networks: z
        .array(z.enum(["newsletter", "telegram", "facebook"]))
        .min(1)
        .max(3),
    })
    .safeParse(input);
  if (!p.success)
    return {
      error: "Enter one to four hours (0–23) and at least one destination.",
    };
  const { db } = await requirePermission("settings.manage");
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "distribution_schedule", value: p.data });
  if (error) return { error: "Could not save schedule." };
  revalidatePath("/admin/distribution-schedule");
  return { ok: true };
}
