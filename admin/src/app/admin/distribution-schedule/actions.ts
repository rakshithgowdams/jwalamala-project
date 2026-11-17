"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
export async function saveSchedule(input: unknown) {
  const { tr } = await getUiStrings();
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
      error: tr({
        en: "Enter one to four hours (0–23) and at least one destination.",
        kn: "ಒಂದರಿಂದ ನಾಲ್ಕು ಗಂಟೆಗಳನ್ನು (0–23) ಮತ್ತು ಕನಿಷ್ಠ ಒಂದು ತಾಣವನ್ನು ನಮೂದಿಸಿ.",
        hi: "एक से चार घंटे (0–23) और कम से कम एक गंतव्य दर्ज करें।",
      }),
    };
  const { db } = await requirePermission("settings.manage");
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "distribution_schedule", value: p.data });
  if (error)
    return {
      error: tr({
        en: "Could not save schedule.",
        kn: "ವೇಳಾಪಟ್ಟಿ ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
        hi: "समय-सारणी सहेजी नहीं जा सकी।",
      }),
    };
  revalidatePath("/admin/distribution-schedule");
  return { ok: true };
}
