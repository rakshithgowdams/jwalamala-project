import { requirePermission } from "@/lib/v4/permissions";
import { StoryDesk, type Assignment } from "@/components/admin/v4/StoryDesk";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("content.edit");
  const [rows, people, posts] = await Promise.all([
    db
      .from("story_assignments")
      .select("*")
      .order("deadline_at", { ascending: true })
      .limit(200),
    db.from("profiles").select("id,full_name").neq("role", "reader").limit(200),
    db
      .from("posts")
      .select("id,title_kn")
      .order("updated_at", { ascending: false })
      .limit(200),
  ]);
  if (rows.error) throw Error("Workflow migration required");
  return (
    <>
      <h1>{t.desk}</h1>
      <StoryDesk
        rows={(rows.data || []) as Assignment[]}
        people={people.data || []}
        posts={posts.data || []}
      />
    </>
  );
}
