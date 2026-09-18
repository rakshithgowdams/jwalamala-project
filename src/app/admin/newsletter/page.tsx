import { requirePermission } from "@/lib/v4/permissions";
import { Distribution } from "@/components/admin/v4/Distribution";
import { cleanHtml } from "@/lib/utils/sanitize";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("newsletter.manage");
  const [posts, issues, subscribers] = await Promise.all([
    db
      .from("posts")
      .select("id,title_kn")
      .eq("status", "published")
      .eq("is_seed", false)
      .lte("published_at", new Date().toISOString())
      .limit(100),
    db
      .from("newsletter_issues")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30),
    db
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
  ]);
  if (issues.error) throw Error("Newsletter migration required");
  return (
    <>
      <h1>{t.newsletter}</h1>
      <p>
        {t.activeSubscribers}: {subscribers.count || 0}
      </p>
      <Distribution
        kind="newsletter"
        posts={posts.data || []}
        rows={(issues.data || []).map((row) => ({
          ...row,
          html: cleanHtml(row.html),
        }))}
      />
    </>
  );
}
