"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { pushTopics } from "@/lib/push/schema";
import { revalidatePath } from "next/cache";
export async function queuePush(input: unknown) {
  const { db } = await requirePermission("content.publish");
  const parsed = z
    .object({
      post_id: z.uuid(),
      topic: z.enum(pushTopics),
      title: z.string().trim().min(3).max(110),
      body: z.string().trim().min(3).max(200),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." };
  const { error } = await db.rpc("queue_v4_push", { payload: parsed.data });
  if (error)
    return { error: "ಅಧಿಸೂಚನೆ ಸಿದ್ಧವಾಗಲಿಲ್ಲ. ಸೇವೆಯ ಸ್ಥಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ." };
  revalidatePath("/admin/push");
  return { ok: true };
}
