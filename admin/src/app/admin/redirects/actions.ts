"use server";
import { requireStaff } from "@/lib/auth/require-user";
import { redirectSchema, localPath } from "@/lib/v4/redirects";
import { getUiStrings } from "@/lib/i18n/server";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function saveRedirect(input: unknown) {
  const { db, profile } = await requireStaff();
  if (profile.role !== "admin") notFound();
  const { tr } = await getUiStrings();
  const p = redirectSchema.safeParse(input);
  if (!p.success)
    return {
      error: tr({
        en: "Use distinct local paths, for example /old-story → /news/new-story.",
        kn: "ಬೇರೆ ಬೇರೆ ಸ್ಥಳೀಯ ಮಾರ್ಗಗಳನ್ನು ಬಳಸಿ, ಉದಾಹರಣೆಗೆ /old-story → /news/new-story.",
        hi: "अलग-अलग स्थानीय पथ इस्तेमाल करें, उदाहरण के लिए /old-story → /news/new-story।",
      }),
    };
  const { data: target } = await db
    .from("redirects")
    .select("old_path")
    .eq("old_path", p.data.new_path)
    .maybeSingle();
  const { data: incoming } = await db
    .from("redirects")
    .select("old_path")
    .eq("new_path", p.data.old_path)
    .limit(1);
  if (target || incoming?.length)
    return {
      error: tr({
        en: "Redirect chains are not allowed. Link directly to the final page.",
        kn: "ಮರುನಿರ್ದೇಶನಗಳ ಸರಪಳಿಗೆ ಅನುಮತಿ ಇಲ್ಲ. ಅಂತಿಮ ಪುಟಕ್ಕೆ ನೇರವಾಗಿ ಲಿಂಕ್ ಮಾಡಿ.",
        hi: "रीडायरेक्ट की शृंखला की अनुमति नहीं है। सीधे अंतिम पेज से लिंक करें।",
      }),
    };
  const { error } = await db
    .from("redirects")
    .upsert(p.data, { onConflict: "old_path" });
  revalidatePath("/admin/redirects");
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
export async function removeRedirect(path: string) {
  const { db, profile } = await requireStaff();
  if (profile.role !== "admin") notFound();
  if (!localPath.safeParse(path).success) throw Error("Invalid path");
  const { error } = await db.from("redirects").delete().eq("old_path", path);
  if (error) throw Error("Delete failed");
  revalidatePath("/admin/redirects");
}
