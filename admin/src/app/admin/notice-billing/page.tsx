import { requirePermission } from "@/lib/v4/permissions";
import { NoticeBilling } from "@/components/admin/v4/NoticeBilling";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { db } = await requirePermission("ads.manage");
  const { tr } = await getUiStrings();
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
      <h1>
        {tr({
          en: "Paid notices",
          kn: "ಪಾವತಿಸಿದ ಪ್ರಕಟಣೆಗಳು",
          hi: "सशुल्क सूचनाएँ",
        })}
      </h1>
      <NoticeBilling notices={notices.data || []} />
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{tr({ en: "Notice", kn: "ಪ್ರಕಟಣೆ", hi: "सूचना" })}</th>
              <th>{tr({ en: "Amount", kn: "ಮೊತ್ತ", hi: "राशि" })}</th>
              <th>{tr({ en: "Status", kn: "ಸ್ಥಿತಿ", hi: "स्थिति" })}</th>
              <th>
                {tr({
                  en: "Payment link",
                  kn: "ಪಾವತಿ ಲಿಂಕ್",
                  hi: "भुगतान लिंक",
                })}
              </th>
              <th>
                {tr({ en: "Reference", kn: "ಉಲ್ಲೇಖ", hi: "संदर्भ" })}
              </th>
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
                    {tr({
                      en: "Open payment link",
                      kn: "ಪಾವತಿ ಲಿಂಕ್ ತೆರೆಯಿರಿ",
                      hi: "भुगतान लिंक खोलें",
                    })}
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
