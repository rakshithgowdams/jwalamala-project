"use server";
import { supportSchema } from "@/lib/payments/schema";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
export async function saveSupport(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const { tr } = await getUiStrings();
  const p = supportSchema.safeParse(input);
  if (!p.success)
    return {
      error: tr({
        en: "Check the terms, contact and payment plan details.",
        kn: "ನಿಯಮಗಳು, ಸಂಪರ್ಕ ಮತ್ತು ಪಾವತಿ ಯೋಜನೆಗಳ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "नियम, संपर्क और भुगतान योजना का विवरण जाँचें।",
      }),
    };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "support", value: p.data });
  if (error)
    return {
      error: tr({
        en: "Could not save.",
        kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
        hi: "सहेजा नहीं जा सका।",
      }),
    };
  revalidatePath("/support", "layout");
  return { ok: true };
}
