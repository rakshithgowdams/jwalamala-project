"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
export async function manageJob(input: unknown) {
  const p = z
    .object({
      id: z.uuid(),
      action: z.enum(["retry", "cancel"]),
      checked: z.boolean(),
    })
    .safeParse(input);
  if (!p.success) return { error: "Invalid request" };
  const { db } = await requirePermission("settings.manage");
  const { error } = await db.rpc("manage_v4_job", {
    target: p.data.id,
    action: p.data.action,
    delivery_checked: p.data.checked,
  });
  if (error)
    return {
      error:
        "Cannot update this job. Check status, delivery confirmation and provider idempotency window.",
    };
  revalidatePath("/admin/jobs");
  return { ok: true };
}
