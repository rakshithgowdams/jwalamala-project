import "server-only";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
export async function requirePermission(permission: string) {
  const { db, user } = await requireUser("/admin");
  const { data, error } = await db.rpc("has_permission", {
    requested: permission,
  });
  if (error || data !== true) notFound();
  return { db, user };
}
