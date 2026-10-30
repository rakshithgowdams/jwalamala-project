import { requirePermission } from "@/lib/v4/permissions";
import { jainRulesSchema } from "@/lib/jain/times";
import { JainRulesEditor } from "@/components/admin/v4/JainRulesEditor";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const { data } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "jain_times")
    .maybeSingle();
  const parsed = jainRulesSchema.safeParse(data?.value);
  return (
    <JainRulesEditor
      initial={
        parsed.success
          ? parsed.data
          : { approved: false, approved_by: "", rules: [] }
      }
    />
  );
}
