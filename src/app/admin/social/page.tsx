import { requirePermission } from "@/lib/v4/permissions";
import {
  Distribution,
  SocialConnection,
} from "@/components/admin/v4/Distribution";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("social.manage");
  const [posts, rows, settings] = await Promise.all([
    db
      .from("posts")
      .select("id,title_kn")
      .eq("status", "published")
      .eq("is_seed", false)
      .lte("published_at", new Date().toISOString())
      .limit(100),
    db
      .from("social_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    db.rpc("has_permission", { requested: "settings.manage" }),
  ]);
  if (rows.error) throw Error("Social migration required");
  return (
    <>
      <h1>{t.social}</h1>
      {settings.data && <SocialConnection />}
      <Distribution
        kind="social"
        posts={posts.data || []}
        rows={rows.data || []}
      />
    </>
  );
}
