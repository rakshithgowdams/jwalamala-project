import { requireStaff } from "@/lib/auth/require-user";
import { notFound } from "next/navigation";
import { RedirectManager } from "@/components/admin/v4/RedirectManager";
export default async function Page() {
  const { db, profile } = await requireStaff();
  if (profile.role !== "admin") notFound();
  const { data, error } = await db
    .from("redirects")
    .select("old_path,new_path")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  return <RedirectManager rows={data || []} />;
}
