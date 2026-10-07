import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>;
}) {
  const { db } = await requireStaff();
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let request = db
    .from("audit_log")
    .select("id,actor_id,action,table_name,record_id,created_at")
    .order("created_at", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (query.table)
    request = request.eq("table_name", query.table.slice(0, 100));
  const { data, error } = await request;
  if (error) throw error;
  const suffix = query.table ? "&table=" + encodeURIComponent(query.table) : "";
  return (
    <>
      <h1>Audit history</h1>
      <p>
        Latest changes, with the acting account and record identifier. Private
        record contents are excluded from this view.
      </p>
      <form className="public-filter">
        <label className="field">
          Table
          <input name="table" defaultValue={query.table} />
        </label>
        <button className="button">Filter</button>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Action</th>
              <th>Table</th>
              <th>Record</th>
              <th>Actor</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.created_at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </td>
                <td>{r.action}</td>
                <td>{r.table_name}</td>
                <td>{r.record_id}</td>
                <td>{r.actor_id || "System"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="share-buttons">
        {page > 1 && (
          <Link className="chip" href={"?page=" + (page - 1) + suffix}>
            Previous
          </Link>
        )}
        {data?.length === 50 && (
          <Link className="chip" href={"?page=" + (page + 1) + suffix}>
            Next
          </Link>
        )}
      </nav>
    </>
  );
}
