import { requirePermission } from "@/lib/v4/permissions";
import { UtilityImporter } from "@/components/admin/v4/UtilityImporter";
export default async function Page() {
  await requirePermission("content.edit");
  return <UtilityImporter />;
}
