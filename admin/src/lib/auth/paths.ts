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
