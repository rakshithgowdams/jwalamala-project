import { isMembershipActive } from "@/lib/payments/status";
import { requireUser } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import { intlLocale } from "@/lib/i18n/content";
import { CancelSupport } from "@/components/engagement/CancelSupport";
export default async function Page() {
  const { kn, locale } = await getUiStrings();
  const { db, user } = await requireUser("/account/support");
  const [support, payments, checkouts] = await Promise.all([
    db.from("supporters").select("*").eq("user_id", user.id).maybeSingle(),
    db
      .from("payments")
      .select("*")
      .eq("user_id", user.id)
      .order("paid_at", { ascending: false })
      .limit(100),
    db
      .from("support_checkouts")
      .select("id,status,kind,created_at")
      .eq("user_id", user.id)
      .neq("kind", "once")
      .neq("status", "cancelled"),
  ]);
  return (
    <div className="container page-shell">
      <h1>{kn.mySupport}</h1>
      {support.data && isMembershipActive(support.data.valid_until) && (
        <p className="notice">
          {kn.supporterActiveUntil.replace(
            "{date}",
            new Date(support.data.valid_until).toLocaleDateString(
              intlLocale(locale),
            ),
          )}
        </p>
      )}
      {checkouts.data?.map((c) => (
        <CancelSupport key={c.id} id={c.id} status={c.status} />
      ))}
      <h2>{kn.paymentHistory}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{kn.date}</th>
              <th>{kn.amount}</th>
              <th>{kn.paymentId}</th>
              <th>{kn.status}</th>
            </tr>
          </thead>
          <tbody>
            {payments.data?.map((p) => (
              <tr key={p.id}>
                <td>
                  {new Date(p.paid_at).toLocaleDateString(intlLocale(locale))}
                </td>
                <td>₹{(p.amount / 100).toFixed(2)}</td>
                <td>{p.id}</td>
                <td>
                  {p.status === "captured" ? kn.paymentCaptured : kn.refunded}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!payments.data?.length && <p>{kn.noPayments}</p>}
    </div>
  );
}
