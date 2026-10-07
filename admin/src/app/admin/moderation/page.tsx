import { requirePermission } from "@/lib/v4/permissions";
import { ModerationQueue } from "@/components/admin/v4/ModerationQueue";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("community.manage");
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
