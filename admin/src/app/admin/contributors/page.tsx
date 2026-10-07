import { requirePermission } from "@/lib/v4/permissions";
import { ContributorReviews } from "@/components/admin/v4/ContributorReviews";
export default async function Page() {
  const { db } = await requirePermission("users.manage");
  const { data, error } = await db
    .from("contributor_applications")
    .select("user_id,note,status,place_id")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const { data: posts } = await db
    .from("posts")
    .select("author_id")
    .eq("status", "published")
    .gte("published_at", new Date().toISOString().slice(0, 7) + "-01");
  const counts = new Map<string, number>();
  for (const p of posts || [])
    counts.set(p.author_id, (counts.get(p.author_id) || 0) + 1);
  return (
    <>
      <h1>Contributor applications</h1>
      <ContributorReviews rows={data || []} />
      <section className="utility-panel">
        <h2>Published contributions this month</h2>
        {(data || [])
          .filter((r) => r.status === "approved")
          .sort(
            (a, b) =>
              (counts.get(b.user_id) || 0) - (counts.get(a.user_id) || 0),
          )
          .map((r) => (
            <p key={r.user_id}>
              {r.user_id}: {counts.get(r.user_id) || 0}
            </p>
          ))}
      </section>
    </>
  );
}
