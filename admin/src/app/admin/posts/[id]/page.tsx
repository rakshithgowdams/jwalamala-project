import { SponsorReview } from "@/components/admin/v4/SponsorReview";
import { editorChoices } from "@/lib/v4/editor-choices";
import { ReviewPanel } from "@/components/admin/v4/ReviewPanel";
import { TaskRequestBanner } from "@/components/admin/TaskRequestBanner";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { LazyPostEditor as PostEditor } from "@/components/ui/LazyComponents";
import type { Post } from "@/lib/types";
export default async function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db, profile, user } = await requireStaff();
  const options = await editorChoices(db);
  const { id } = await params;
  const isAdmin = profile.role === "admin";
  if (profile.role === "staff") {
    const { data: task } = await db
      .from("article_tasks")
      .select("id")
      .eq("post_id", id)
      .eq("assignee_id", user.id)
      .eq("status", "open")
      .maybeSingle();
    if (!task) notFound();
  }
  const server = getAdminClient() || db;
  const [{ data: p }, { data: categories }, mathaLinks, requestRes] =
    await Promise.all([
      db
        .from("posts")
        .select(
          "*,key_points(seconds,label_kn),post_categories(category_id,is_primary,categories(slug)),post_tags(tag_id)",
        )
        .eq("id", id)
        .maybeSingle(),
      db.from("categories").select("*").order("sort_order"),
      db.from("post_mathas").select("matha_id").eq("post_id", id),
      (() => {
        let q = server
          .from("article_task_requests")
          .select("id,status,drive_url,staff_note,admin_note")
          .eq("post_id", id)
          .in("status", ["requested", "processing", "ready"])
          .order("created_at", { ascending: false })
          .limit(1);
        if (!isAdmin) q = q.eq("requester_id", user.id);
        return q.maybeSingle();
      })(),
    ]);
  if (!p) notFound();
  const post = {
    ...p,
    primary_category: p.post_categories.find(
      (c: { is_primary: boolean }) => c.is_primary,
    )?.category_id,
    tag_ids: p.post_tags.map((t: { tag_id: string }) => t.tag_id),
    category_slugs: (
      p.post_categories as { categories: { slug: string } }[]
    ).map((c) => c.categories.slug),
  } as Post;
  const mathaIds = (mathaLinks.data || []).map((row) => row.matha_id);
  const [versions, comments] = await Promise.all([
    db
      .from("post_versions")
      .select("id,created_at,snapshot")
      .eq("post_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("story_comments")
      .select("id,body,paragraph_index,resolved")
      .eq("post_id", id)
      .order("created_at")
      .limit(100),
  ]);
  const activeRequest = requestRes.data
    ? {
        id: requestRes.data.id as string,
        status: requestRes.data.status as string,
        driveUrl: (requestRes.data.drive_url as string) || "",
        staffNote: (requestRes.data.staff_note as string) || "",
        adminNote: (requestRes.data.admin_note as string) || "",
      }
    : null;
  return (
    <>
      {activeRequest ? <TaskRequestBanner isAdmin={isAdmin} request={activeRequest} /> : null}
      <PostEditor
        post={post}
        categories={categories || []}
        canDelete={profile.role === "admin"}
        mathaIds={mathaIds}
        {...options}
      />
      {post.sponsor_name && <SponsorReview postId={id} />}
      <ReviewPanel
        current={{ title_kn: post.title_kn, body_html: post.body_html }}
        postId={id}
        versions={versions.data || []}
        comments={comments.data || []}
      />
    </>
  );
}
