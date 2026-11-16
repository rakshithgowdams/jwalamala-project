import "server-only";
import { cache } from "react";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { allSections, grantableKeys } from "@/lib/admin/sections";

/**
 * Sidebar features the signed-in account may open; null means every feature
 * (administrators). Staff accounts get exactly what an administrator granted;
 * the older job roles get what their role permissions allow.
 */
export const getSectionAccess = cache(async (): Promise<string[] | null> => {
  const { db, profile } = await requireStaff();
  const role = String(profile.role);
  if (role === "admin") return null;
  if (role === "staff") {
    const { data } = await db.from("profiles").select("admin_sections").eq("id", profile.id).single();
    const granted = ((data?.admin_sections as string[] | null) || []).filter((key) => grantableKeys.includes(key));
    return ["", ...granted];
  }
  const server = getAdminClient();
  if (!server) return null;
  const { data } = await server
    .from("role_permissions")
    .select("permission")
    .eq("role", role)
    .eq("allowed", true);
  const held = new Set(["admin.access", ...(data || []).map((row) => row.permission as string)]);
  return allSections.filter((s) => !s.adminOnly && held.has(s.view)).map((s) => s.key);
});
