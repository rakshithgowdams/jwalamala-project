import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { kn } from "@/content/strings.kn";
export default async function Dashboard() {
  const { db } = await requireStaff();
  const counts = await Promise.all(
    ["posts", "events", "submissions"].map((table) =>
      db.from(table).select("id", { count: "exact", head: true }),
    ),
  );
  return (
    <>
      <div className="section-title">
        <h1>{kn.dashboard}</h1>
        <Link href="/admin/posts/new" className="button button-ember">
          {kn.newPost}
        </Link>
      </div>
      <div className="stat-grid">
        {[kn.posts, kn.events, kn.submissions].map((title, i) => (
          <div className="stat" key={title}>
            <strong>{counts[i].count || 0}</strong>
            <span>{title}</span>
          </div>
        ))}
      </div>
      <Link className="button button-outline" href="/admin/posts">
        {kn.posts}
      </Link>
    </>
  );
}
