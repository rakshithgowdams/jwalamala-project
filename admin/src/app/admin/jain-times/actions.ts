"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { jainRulesSchema } from "@/lib/jain/times";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
export async function saveJainTimes(input: unknown) {
  const { db } = await requirePermission("settings.manage");
  const { tr } = await getUiStrings();
  const parsed = jainRulesSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: tr({
        en: "Check rule names, offsets and advisor approval.",
        kn: "ನಿಯಮಗಳ ಹೆಸರುಗಳು, ಸಮಯದ ಅಂತರಗಳು ಮತ್ತು ಸಲಹೆಗಾರರ ಅನುಮೋದನೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "नियमों के नाम, समय-अंतर और सलाहकार की स्वीकृति जाँचें।",
      }),
    };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "jain_times", value: parsed.data });
  revalidatePath("/", "layout");
  return {
    error: error
      ? tr({
          en: "Save failed",
          kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ",
          hi: "सहेजा नहीं जा सका",
        })
      : "",
  };
}
