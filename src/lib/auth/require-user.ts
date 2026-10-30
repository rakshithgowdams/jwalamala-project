import { redirect } from "next/navigation";
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
