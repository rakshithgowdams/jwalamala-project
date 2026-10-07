import { Pagination } from "@/components/ui/Pagination";
import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { kn } from "@/content/strings.kn";
export default async function Posts({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const filters = await searchParams;
  const page = Math.max(
    1,
    Math.min(10000, Math.floor(Number(filters.page)) || 1),
  );
  const { db } = await requireStaff();
  let query = db
    .from("posts")
    .select("id,title_kn,status,event_date", { count: "exact" })
    .order("updated_at", { ascending: false });
  if (filters.q)
    query = query.ilike(
      "title_kn",
      "%" + filters.q.slice(0, 200).replace(/[%_]/g, "") + "%",
    );
  if (
    ["draft", "published", "scheduled", "archived"].includes(
      filters.status || "",
    )
  )
    query = query.eq("status", filters.status!);
  if (["article", "video", "short"].includes(filters.type || ""))
    query = query.eq("type", filters.type!);
  const {
    data: posts,
    error,
    count,
  } = await query.range((page - 1) * 30, page * 30 - 1);
  if (error) throw error;
  return (
    <>
      <div className="section-title">
        <h1>{kn.posts}</h1>
        <Link href="/admin/posts/new" className="button button-ember">
          {kn.newPost}
        </Link>
      </div>
      <form className="form-grid" method="get">
        <label className="field">
          Search
          <input name="q" defaultValue={filters.q} />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All</option>
            {["draft", "scheduled", "published", "archived"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Type
          <select name="type" defaultValue={filters.type}>
            <option value="">All</option>
            {["article", "video", "short"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <button className="button button-outline">Filter</button>
      </form>
      <table className="admin-table">
        <thead>
          <tr>
            <th>{kn.title}</th>
            <th>{kn.status}</th>
            <th>{kn.eventDate}</th>
          </tr>
        </thead>
        <tbody>
          {posts?.map((p) => (
            <tr key={p.id}>
              <td>
                <Link href={"/admin/posts/" + p.id}>{p.title_kn}</Link>
              </td>
              <td>{p.status}</td>
              <td>{p.event_date}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination
        page={page}
        pages={Math.ceil((count || 0) / 30)}
        query={{ q: filters.q, status: filters.status, type: filters.type }}
      />
    </>
  );
}
