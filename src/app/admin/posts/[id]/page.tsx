import { SponsorReview } from "@/components/admin/v4/SponsorReview";
import { editorChoices } from "@/lib/v4/editor-choices";
import { ReviewPanel } from "@/components/admin/v4/ReviewPanel";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { LazyPostEditor as PostEditor } from "@/components/ui/LazyComponents";
import type { Post } from "@/lib/types";
export default async function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requireStaff();
  const options = await editorChoices(db);
  const { id } = await params;
  const [{ data: p }, { data: categories }] = await Promise.all([
    db
      .from("posts")
      .select(
        "*,key_points(seconds,label_kn),post_categories(category_id,is_primary,categories(slug)),post_tags(tag_id)",
      )
      .eq("id", id)
      .maybeSingle(),
    db.from("categories").select("*").order("sort_order"),
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
  return (
    <>
      <PostEditor post={post} categories={categories || []} {...options} />
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
