"use server";
import { requirePermission } from "@/lib/v4/permissions";
import { homeSchema } from "@/lib/v4/home";
import { revalidatePath } from "next/cache";
export async function saveHome(input: unknown) {
  const { db } = await requirePermission("content.edit"),
    parsed = homeSchema.safeParse(input);
  if (!parsed.success) return { error: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." };
  const ids = [parsed.data.lead_id, ...parsed.data.pick_ids].filter(Boolean);
  if (ids.length) {
    const { data, error } = await db
      .from("posts")
      .select("id")
      .in("id", ids)
      .eq("status", "published");
    if (error || new Set(data?.map((p) => p.id)).size !== new Set(ids).size)
      return { error: "ಪ್ರಕಟಿತ ಲೇಖನಗಳನ್ನು ಮಾತ್ರ ಆಯ್ಕೆಮಾಡಿ." };
  }
  const { error } = await db.rpc("save_homepage", {
    configuration: parsed.data,
  });
  if (error) return { error: "ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ." };
  revalidatePath("/");
  return { ok: true };
}
