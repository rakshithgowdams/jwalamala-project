"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { programmesHubSchema } from "@/lib/v4/programmes";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";

export async function saveProgrammesHub(input: unknown) {
  const { db } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
  const parsed = programmesHubSchema.safeParse(input);
  if (!parsed.success)
    return {
      error: tr({
        en: "Check the programme cards.",
        kn: "ಕಾರ್ಯಕ್ರಮ ಕಾರ್ಡ್‌ಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "कार्यक्रम कार्ड जाँचें।",
      }),
    };
  const { error } = await db
    .from("site_settings")
    .upsert({ key: "programmes_hub", value: parsed.data });
  if (error)
    return {
      error: tr({
        en: "Could not save.",
        kn: "ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        hi: "सहेजा नहीं जा सका।",
      }),
    };
  revalidatePath("/category/jwalamala-programmes");
  revalidatePath("/", "layout");
  return { ok: true };
}
