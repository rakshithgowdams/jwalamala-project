import { requirePermission } from "@/lib/v4/permissions";
import { RoleMatrix } from "@/components/admin/v4/ProviderControls";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { db } = await requirePermission("users.manage"),
    { data, error } = await db
      .from("role_permissions")
      .select("role,permission,allowed");
  const { v4: t } = await getUiStrings();
  if (error) throw Error("Role migration required");
  return (
    <>
      <h1>{t.roles}</h1>
      <RoleMatrix rows={data || []} />
    </>
  );
}
