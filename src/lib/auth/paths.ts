import { safeReturnPath } from "@/lib/utils/dates";

export function loginPath(next: string) {
  return `/login?next=${encodeURIComponent(safeReturnPath(next))}`;
}
