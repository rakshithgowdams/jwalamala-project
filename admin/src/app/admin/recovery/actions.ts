"use server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
const schema = z.object({
  key: z.string().min(1).max(100),
  postId: z.uuid().optional(),
  snapshot: z.object({
    fields: z.array(z.tuple([z.string(), z.string()])).max(500),
    body: z.unknown(),
  }),
});
export async function saveRecovery(input: unknown) {
  const p = schema.safeParse(input);
  if (!p.success || JSON.stringify(p.data.snapshot).length > 200000)
    return { error: "Invalid draft" };
  const { db, user } = await requireStaff();
  const { error } = await db.from("editor_recovery").upsert({
    user_id: user.id,
    draft_key: p.data.key,
    post_id: p.data.postId || null,
    snapshot: p.data.snapshot,
    updated_at: new Date().toISOString(),
  });
  return error ? { error: "Could not save recovery" } : { ok: true };
}
export async function loadRecovery(key: string) {
  const { db, user } = await requireStaff();
  const { data } = await db
    .from("editor_recovery")
    .select("snapshot,updated_at")
    .eq("user_id", user.id)
    .eq("draft_key", key.slice(0, 100))
    .maybeSingle();
  return data;
}
export async function clearRecovery(key: string) {
  const { db, user } = await requireStaff();
  await db
    .from("editor_recovery")
    .delete()
    .eq("user_id", user.id)
    .eq("draft_key", key.slice(0, 100));
}
