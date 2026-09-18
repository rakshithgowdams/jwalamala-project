import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import { v4 as t } from "@/content/strings.kn";
import { AnalyticsRefresh } from "@/components/admin/v4/AnalyticsRefresh";
function since(milliseconds: number) {
  return new Date(Date.now() - milliseconds).toISOString();
}
export default async function Page() {
  const { db } = await requirePermission("analytics.read");
  const [live, daily] = await Promise.all([
    db
      .from("page_pulse")
      .select("session_hash,post_id,posts(title_kn)")
      .gte("last_seen_at", since(300000))
      .limit(10000),
    db
      .from("post_engagement_daily")
      .select("*,posts(title_kn)")
      .gte("day", since(7 * 86400000).slice(0, 10))
      .order("views", { ascending: false })
      .limit(100),
  ]);
  if (live.error || daily.error) throw Error("Analytics migration required");
  const readers = new Set((live.data || []).map((r) => r.session_hash)).size;
  return (
    <>
      <h1>{t.analytics}</h1>
      <AnalyticsRefresh />
      <Link className="chip" href="/admin/analytics/posts">
        Article performance
      </Link>
      <section className="utility-panel">
        <h2>{t.liveReaders}</h2>
        <strong className="stat-number">{readers}</strong>
        <p>{t.analyticsWindow}</p>
      </section>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.title}</th>
              <th>{t.updated}</th>
              <th>{t.views}</th>
              <th>{t.engagedSeconds}</th>
              <th>{t.shares}</th>
              <th>{t.listens}</th>
            </tr>
          </thead>
          <tbody>
            {(daily.data || []).map((r, i) => (
              <tr key={i}>
                <td>
                  {(r.posts as unknown as { title_kn: string } | null)
                    ?.title_kn || r.post_id}
                </td>
                <td>{r.day}</td>
                <td>{r.views}</td>
                <td>{r.engaged_seconds}</td>
                <td>{r.share_clicks}</td>
                <td>{r.listen_plays}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <a
        download
        href="/api/admin/analytics-report"
        className="button button-outline"
      >
        {t.exportCsv}
      </a>
    </>
  );
}
