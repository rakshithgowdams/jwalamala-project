"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { homeSchema } from "@/lib/v4/home";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
export async function saveHome(input: unknown) {
  const { db } = await requirePermission("content.edit"),
    parsed = homeSchema.safeParse(input);
  const { tr } = await getUiStrings();
  if (!parsed.success)
    return {
      error: tr({
        en: "Check the details.",
        kn: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "विवरण जाँचें।",
      }),
    };
  const ids = [parsed.data.lead_id, ...parsed.data.pick_ids].filter(Boolean);
  if (ids.length) {
    const { data, error } = await db
      .from("posts")
      .select("id")
      .in("id", ids)
      .eq("status", "published");
    if (error || new Set(data?.map((p) => p.id)).size !== new Set(ids).size)
      return {
        error: tr({
          en: "Choose published articles only.",
          kn: "ಪ್ರಕಟಿತ ಲೇಖನಗಳನ್ನು ಮಾತ್ರ ಆಯ್ಕೆಮಾಡಿ.",
          hi: "केवल प्रकाशित लेख चुनें।",
        }),
      };
  }
  const { error } = await db.rpc("save_homepage", {
    configuration: parsed.data,
  });
  if (error)
    return {
      error: tr({
        en: "Could not save.",
        kn: "ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        hi: "सहेजा नहीं जा सका।",
      }),
    };
  revalidatePath("/");
  return { ok: true };
}
