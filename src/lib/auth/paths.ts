import { safeReturnPath } from "@/lib/utils/dates";

export function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

export function loginPath(next: string) {
  const target = safeReturnPath(next);
  return `${isAdminPath(target.split("?")[0]) ? "/auth/admin" : "/login"}?next=${encodeURIComponent(target)}`;
}

export function adminReturnPath(value?: string | null) {
  const path = safeReturnPath(value);
  return isAdminPath(path.split("?")[0]) ? path : "/admin";
}
