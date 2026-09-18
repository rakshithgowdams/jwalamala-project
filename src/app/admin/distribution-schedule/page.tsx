import { requirePermission } from "@/lib/v4/permissions";
import { ScheduleControls } from "@/components/admin/v4/ScheduleControls";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const { data } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "distribution_schedule")
    .maybeSingle();
  return (
    <>
      <h1>Bulletin draft schedule</h1>
      <p>
        Prepare morning and evening drafts from recent published stories. Each
        issue still requires editorial approval before sending.
      </p>
      <ScheduleControls
        initial={
          data?.value || {
            enabled: false,
            hours: [7, 18],
            networks: ["newsletter", "telegram"],
          }
        }
      />
    </>
  );
}
