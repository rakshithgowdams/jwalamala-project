"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { pushTopics } from "@/lib/push/schema";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@/lib/supabase/admin";
export async function queuePush(input: unknown) {
  const { db } = await requirePermission("content.publish");
  const { tr } = await getUiStrings();
  const parsed = z
    .object({
      post_id: z.uuid(),
      topic: z.enum(pushTopics),
      title: z.string().trim().min(3).max(110),
      body: z.string().trim().min(3).max(200),
    })
    .safeParse(input);
  if (!parsed.success)
    return {
      error: tr({
        en: "Check the details.",
        kn: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "विवरण जाँचें।",
      }),
    };
  const { error } = await db.rpc("queue_v4_push", { payload: parsed.data });
  if (error)
    return {
      error: tr({
        en: "The notification could not be prepared. Check the service status.",
        kn: "ಅಧಿಸೂಚನೆ ಸಿದ್ಧವಾಗಲಿಲ್ಲ. ಸೇವೆಯ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "सूचना तैयार नहीं हो सकी। सेवा की स्थिति जाँचें।",
      }),
    };
  revalidatePath("/admin/push");
  return { ok: true };
}

/** Deletes a notification; deliveries not yet sent go with it, so it is effectively cancelled. */
export async function deletePush(id: string) {
  await requirePermission("content.publish");
  const { tr } = await getUiStrings();
  const failed = {
    error: tr({
      en: "The notification could not be deleted.",
      kn: "ಅಧಿಸೂಚನೆಯನ್ನು ಅಳಿಸಲಾಗಲಿಲ್ಲ.",
      hi: "सूचना हटाई नहीं जा सकी।",
    }),
  };
  if (!z.uuid().safeParse(id).success) return failed;
  // Editors may only read campaigns; the service client writes after the permission check.
  const admin = getAdminClient();
  if (!admin) return failed;
  const { data, error } = await admin.from("push_campaigns").delete().eq("id", id).select("id");
  if (error || !data?.length) return failed;
  revalidatePath("/admin/push");
  return { ok: true };
}
