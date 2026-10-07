"use server";
import { supportSchema } from "@/lib/payments/schema";
import { requirePermission } from "@/lib/v4/permissions";
import { revalidatePath } from "next/cache";
export async function saveSupport(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const p = supportSchema.safeParse(input);
  if (!p.success)
    return {
      error: "ನಿಯಮಗಳು, ಸಂಪರ್ಕ ಮತ್ತು ಪಾವತಿ ಯೋಜನೆಗಳ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
    };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "support", value: p.data });
  if (error) return { error: "ಉಳಿಸಲಾಗಲಿಲ್ಲ." };
  revalidatePath("/support", "layout");
  return { ok: true };
}
