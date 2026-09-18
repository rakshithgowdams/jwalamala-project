import { requirePermission } from "@/lib/v4/permissions";
import { CommentModeration } from "@/components/admin/v4/CommentModeration";
import { commentSettingsSchema, defaultComments } from "@/lib/v4/comments";
export default async function Page() {
  const { db } = await requirePermission("community.manage");
  const [rows, reports, config, permission] = await Promise.all([
    db
      .from("post_comments")
      .select("id,user_id,display_name,body,status,flagged")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("comment_reports")
      .select("comment_id,reason")
      .order("created_at", { ascending: false })
      .limit(100),
    db
      .from("site_settings")
      .select("value")
      .eq("key", "comments")
      .maybeSingle(),
    db.rpc("has_permission", { requested: "settings.manage" }),
  ]);
  return (
    <>
      <h1>ಅಭಿಪ್ರಾಯಗಳ ಪರಿಶೀಲನೆ</h1>
      <CommentModeration
        rows={rows.data || []}
        reports={reports.data || []}
        config={commentSettingsSchema
          .catch(defaultComments)
          .parse(config.data?.value || defaultComments)}
        canConfigure={permission.data === true}
      />
    </>
  );
}
