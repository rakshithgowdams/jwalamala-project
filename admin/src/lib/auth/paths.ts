import { grantableKeys, sectionForPath } from "@/lib/admin/sections";
import { safeReturnPath } from "@/lib/utils/dates";

export function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

/** The admin app has a single sign-in screen; anything else returns to /admin. */
export function loginPath(next: string) {
  return `/auth/admin?next=${encodeURIComponent(adminReturnPath(next))}`;
}

export function adminReturnPath(value?: string | null) {
  const path = safeReturnPath(value);
  return isAdminPath(path.split("?")[0]) ? path : "/admin";
}

/**
 * After sign-in, send staff to a page they can open. Admin-only URLs like
 * /admin/staff (left in ?next= from an administrator session) must not 404.
 */
export function resolvePostLoginPath(
  next: string | null | undefined,
  profile: { role?: string | null; admin_sections?: string[] | null },
) {
  const path = adminReturnPath(next);
  const role = String(profile.role || "");
  if (role === "admin") return path;
  if (role !== "staff") return path;

  const allowed = new Set<string>([
    "",
    ...((profile.admin_sections || []).filter((key) => grantableKeys.includes(key))),
  ]);
  const section = sectionForPath(path.split("?")[0] || "/admin");
  if (section !== null && allowed.has(section)) return path;
  if (allowed.has("tasks")) return "/admin/tasks";
  if (allowed.has("posts")) return "/admin/posts";
  const first = [...allowed].find((key) => key);
  return first ? `/admin/${first}` : "/admin";
}
