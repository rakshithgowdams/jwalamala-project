"use server";
import { requireStaff } from "@/lib/auth/require-user";
import { redirectSchema, localPath } from "@/lib/v4/redirects";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function saveRedirect(input: unknown) {
  const { db, profile } = await requireStaff();
  if (profile.role !== "admin") notFound();
  const p = redirectSchema.safeParse(input);
  if (!p.success)
    return {
      error:
        "Use distinct local paths, for example /old-story → /news/new-story.",
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
      error:
        "Redirect chains are not allowed. Link directly to the final page.",
    };
  const { error } = await db
    .from("redirects")
    .upsert(p.data, { onConflict: "old_path" });
  revalidatePath("/admin/redirects");
  return { error: error ? "Save failed" : "" };
}
export async function removeRedirect(path: string) {
  const { db, profile } = await requireStaff();
  if (profile.role !== "admin") notFound();
  if (!localPath.safeParse(path).success) throw Error("Invalid path");
  const { error } = await db.from("redirects").delete().eq("old_path", path);
  if (error) throw Error("Delete failed");
  revalidatePath("/admin/redirects");
}
