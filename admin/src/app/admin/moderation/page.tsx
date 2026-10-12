import { requirePermission } from "@/lib/v4/permissions";
import { ModerationQueue } from "@/components/admin/v4/ModerationQueue";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { db } = await requirePermission("community.manage");
  const { v4: t } = await getUiStrings();
  const { data, error } = await db
    .from("community_submissions")
    .select("id,kind,status,payload")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (
    <>
      <h1>{t.moderation}</h1>
      <ModerationQueue rows={data || []} />
    </>
  );
}
