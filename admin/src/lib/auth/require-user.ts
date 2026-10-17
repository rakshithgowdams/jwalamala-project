import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { getServerClient } from "@/lib/supabase/server";
import { loginPath } from "./paths";

/** Shared for the layout and the page, so one visit does not sign in twice. */
export const requireUser = cache(async (next = "/admin") => {
  const db = await getServerClient();
  if (!db) redirect(loginPath(next));
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) redirect(loginPath(next));
  return { db, user };
});

export const requireStaff = cache(async () => {
  const { db, user } = await requireUser("/admin");
  const [{ data: profile }, { data: allowed }] = await Promise.all([
    db.from("profiles").select("id,role,full_name").eq("id", user.id).single(),
    db.rpc("has_permission", { requested: "admin.access" }),
  ]);
  if (!profile) notFound();
  if (allowed !== true) redirect(loginPath("/admin") + "&error=access");
  return { db, user, profile };
});
