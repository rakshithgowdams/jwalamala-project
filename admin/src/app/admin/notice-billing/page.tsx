import { requirePermission } from "@/lib/v4/permissions";
import { NoticeBilling } from "@/components/admin/v4/NoticeBilling";
export default async function Page() {
  const { db } = await requirePermission("ads.manage");
  const [notices, bills] = await Promise.all([
    db
      .from("notices")
      .select("id,title_kn")
      .order("created_at", { ascending: false })
      .limit(200),
    db
      .from("notice_billing")
      .select("*,notices(title_kn)")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  if (notices.error || bills.error)
    throw Error("Notice billing migration required");
  return (
    <>
      <h1>Paid notices</h1>
      <NoticeBilling notices={notices.data || []} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Notice</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment link</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {bills.data?.map((b) => (
              <tr key={b.notice_id}>
                <td>{b.notices?.title_kn}</td>
                <td>₹{(b.amount_paise / 100).toFixed(2)}</td>
                <td>{b.status}</td>
                <td>
                  <a
                    href={b.payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open payment link
                  </a>
                </td>
                <td>{b.payment_reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
