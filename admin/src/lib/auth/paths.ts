import { grantableKeys, sectionForPath } from "@/lib/admin/sections";
import { safeReturnPath } from "@/lib/utils/dates";

export function isAdminPath(path: string) {
  return path === "/admin" || path.startsWith("/admin/");
}

export function isStaffPath(path: string) {
  return path === "/staff" || path.startsWith("/staff/");
}

/** Authenticated desk URLs for either role. */
export function isDeskPath(path: string) {
  return isAdminPath(path) || isStaffPath(path);
}

export function deskBase(role?: string | null) {
  return role === "staff" ? "/staff" : "/admin";
}

/** Strip /admin or /staff prefix, keep the rest (no leading slash unless empty → ""). */
export function deskSuffix(path: string) {
  const bare = path.split("?")[0] || "";
  if (bare === "/admin" || bare === "/staff") return "";
  if (bare.startsWith("/admin/")) return bare.slice("/admin".length);
  if (bare.startsWith("/staff/")) return bare.slice("/staff".length);
  return bare;
}

/** Map any desk URL onto the given role's root. */
export function toDeskPath(path: string, role?: string | null) {
  const base = deskBase(role);
  const suffix = deskSuffix(path);
  const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
  return (suffix ? `${base}${suffix}` : base) + query;
}

/** Build a desk href from a section key ("" = home). */
export function deskHref(basePath: string, sectionKey = "") {
  return sectionKey ? `${basePath}/${sectionKey}` : basePath;
}

/** The admin app has a single sign-in screen; desk next URLs stay under /admin or /staff. */
export function loginPath(next: string) {
  return `/auth/admin?next=${encodeURIComponent(deskReturnPath(next))}`;
}

export function adminReturnPath(value?: string | null) {
  return deskReturnPath(value, "admin");
}

export function deskReturnPath(value?: string | null, role?: string | null) {
  const path = safeReturnPath(value);
  const bare = path.split("?")[0];
  if (isDeskPath(bare)) return toDeskPath(path, role || (isStaffPath(bare) ? "staff" : "admin"));
  return deskBase(role);
}

/**
 * After sign-in, send staff to a page they can open. Admin-only URLs like
 * /admin/staff (left in ?next= from an administrator session) must not 404.
 */
export function resolvePostLoginPath(
  next: string | null | undefined,
  profile: { role?: string | null; admin_sections?: string[] | null },
) {
  const role = String(profile.role || "");
  const base = deskBase(role);

  if (role === "admin") {
    const path = deskReturnPath(next, "admin");
    return isAdminPath(path.split("?")[0]) ? path : "/admin";
  }

  if (role !== "staff") {
    return deskReturnPath(next, role);
  }

  const allowed = new Set<string>([
    "",
    ...((profile.admin_sections || []).filter((key) => grantableKeys.includes(key))),
  ]);

  const requested = deskReturnPath(next, "staff");
  const section = sectionForPath(requested.split("?")[0] || "/staff");
  if (section !== null && allowed.has(section)) return toDeskPath(requested, "staff");

  if (allowed.has("tasks")) return `${base}/tasks`;
  if (allowed.has("task-requests")) return `${base}/task-requests`;
  if (allowed.has("posts")) return `${base}/posts`;
  if (allowed.has("chat")) return `${base}/chat`;
  const first = [...allowed].find((key) => key);
  return first ? `${base}/${first}` : base;
}
