import { requirePermission } from "@/lib/v4/permissions";
import { RoleMatrix } from "@/components/admin/v4/ProviderControls";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("users.manage"),
    { data, error } = await db
      .from("role_permissions")
      .select("role,permission,allowed");
  if (error) throw Error("Role migration required");
  return (
    <>
      <h1>{t.roles}</h1>
      <RoleMatrix rows={data || []} />
    </>
  );
}
