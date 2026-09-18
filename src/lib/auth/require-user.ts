import { redirect, notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { loginPath } from "./paths";
export async function requireUser(next = "/account") {
  const db = await getServerClient();
  if (!db) redirect(loginPath(next));
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(loginPath(next));
  return { db, user };
}
export async function requireStaff() {
  const { db, user } = await requireUser("/admin");
  const { data: profile } = await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  const { data: allowed } = await db.rpc("has_permission", {
    requested: "admin.access",
  });
  if (!profile || allowed !== true) notFound();
  return { db, user, profile };
}
