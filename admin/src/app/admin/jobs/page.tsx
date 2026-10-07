import { JobControls } from "@/components/admin/v4/JobControls";
import { requirePermission } from "@/lib/v4/permissions";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const { data, error } = await db
    .from("automation_jobs")
    .select("id,kind,status,attempts,run_after,last_error")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw Error("Job migration required");
  return (
    <>
      <h1>{t.jobs}</h1>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.contentType}</th>
              <th>{t.status}</th>
              <th>{t.attempts}</th>
              <th>{t.note}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((row) => (
              <tr key={row.id}>
                <td>{row.kind}</td>
                <td>{row.status}</td>
                <td>{row.attempts}</td>
                <td>{row.last_error}</td>
                <td>
                  <JobControls
                    id={row.id}
                    status={row.status}
                    kind={row.kind}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
