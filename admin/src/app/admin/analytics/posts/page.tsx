import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import { LazyValueChart as ValueChart } from "@/components/ui/LazyComponents";
import { z } from "zod";
function reportStart() {
  return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { db } = await requirePermission("analytics.read");
  const id = (await searchParams).post;
  const { data: posts } = await db
    .from("posts")
    .select("id,title_kn")
    .order("published_at", { ascending: false })
    .limit(200);
  const selected = z.uuid().safeParse(id).success ? id : posts?.[0]?.id;
  const since = reportStart();
  const { data: rows, error } = selected
    ? await db
        .from("post_engagement_daily")
        .select("*")
        .eq("post_id", selected)
        .gte("day", since)
        .order("day")
    : { data: [], error: null };
  if (error) throw error;
  const values = rows || [];
  const total = (key: string) =>
    values.reduce((sum, r) => sum + Number(r[key] || 0), 0);
  return (
    <>
      <h1>Article performance · 30 days</h1>
      <Link className="chip" href="/admin/analytics/live">
        Live readers
      </Link>
      <form method="get" className="form-grid">
        <label className="field wide">
          Article
          <select name="post" defaultValue={selected}>
            {posts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title_kn}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">View report</button>
      </form>
      <div className="utility-grid">
        {[
          ["Views", total("views")],
          ["Engaged seconds", total("engaged_seconds")],
          ["Shares", total("share_clicks")],
          ["Listens", total("listen_plays")],
        ].map(([label, value]) => (
          <div className="stat-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {values.length > 0 ? (
        <>
          <ValueChart
            label="Daily views"
            unit="views"
            points={values.map((r) => ({
              date: r.day,
              value: Number(r.views),
            }))}
          />
          <ValueChart
            label="Engaged reading"
            unit="seconds"
            points={values.map((r) => ({
              date: r.day,
              value: Number(r.engaged_seconds),
            }))}
          />
        </>
      ) : (
        <p>No recorded activity in this period.</p>
      )}
      <div className="utility-grid">
        {["scroll_25", "scroll_50", "scroll_75", "scroll_100"].map((k) => (
          <div className="stat-tile" key={k}>
            <span>{k.replace("scroll_", "Scroll ") + "%"}</span>
            <strong>{total(k)}</strong>
          </div>
        ))}
      </div>
      <a
        className="button button-outline"
        href="/api/admin/analytics-report"
        download
      >
        Export report
      </a>
    </>
  );
}
