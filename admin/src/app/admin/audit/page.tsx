import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>;
}) {
  const { db } = await requireStaff();
  const { tr, locale } = await getUiStrings();
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
  const tableLabel = tr({ en: "Table", kn: "ಕೋಷ್ಟಕ", hi: "तालिका" });
  return (
    <>
      <h1>
        {tr({
          en: "Audit history",
          kn: "ಬದಲಾವಣೆಗಳ ಇತಿಹಾಸ",
          hi: "ऑडिट इतिहास",
        })}
      </h1>
      <p>
        {tr({
          en: "Latest changes, with the acting account and record identifier. Private record contents are excluded from this view.",
          kn: "ಇತ್ತೀಚಿನ ಬದಲಾವಣೆಗಳು, ಬದಲಾವಣೆ ಮಾಡಿದ ಖಾತೆ ಮತ್ತು ದಾಖಲೆಯ ಗುರುತಿನೊಂದಿಗೆ. ಖಾಸಗಿ ದಾಖಲೆಗಳ ವಿಷಯವನ್ನು ಇಲ್ಲಿ ತೋರಿಸಲಾಗುವುದಿಲ್ಲ.",
          hi: "नवीनतम बदलाव, बदलाव करने वाले खाते और रिकॉर्ड पहचानकर्ता के साथ। निजी रिकॉर्ड की सामग्री इस दृश्य में शामिल नहीं है।",
        })}
      </p>
      <form className="public-filter">
        <label className="field">
          {tableLabel}
          <input name="table" defaultValue={query.table} />
        </label>
        <button className="button">
          {tr({ en: "Filter", kn: "ಫಿಲ್ಟರ್", hi: "फ़िल्टर" })}
        </button>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{tr({ en: "Time", kn: "ಸಮಯ", hi: "समय" })}</th>
              <th>{tr({ en: "Action", kn: "ಕ್ರಿಯೆ", hi: "कार्रवाई" })}</th>
              <th>{tableLabel}</th>
              <th>{tr({ en: "Record", kn: "ದಾಖಲೆ", hi: "रिकॉर्ड" })}</th>
              <th>{tr({ en: "Actor", kn: "ಮಾಡಿದವರು", hi: "कर्ता" })}</th>
            </tr>
          </thead>
          <tbody>
            {(data || []).map((r) => (
              <tr key={r.id}>
                <td>
                  {new Date(r.created_at).toLocaleString(locale + "-IN", {
                    timeZone: "Asia/Kolkata",
                  })}{" "}
                  IST
                </td>
                <td>{r.action}</td>
                <td>{r.table_name}</td>
                <td>{r.record_id}</td>
                <td>
                  {r.actor_id ||
                    tr({ en: "System", kn: "ವ್ಯವಸ್ಥೆ", hi: "सिस्टम" })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav className="share-buttons">
        {page > 1 && (
          <Link className="chip" href={"?page=" + (page - 1) + suffix}>
            {tr({ en: "Previous", kn: "ಹಿಂದಿನದು", hi: "पिछला" })}
          </Link>
        )}
        {data?.length === 50 && (
          <Link className="chip" href={"?page=" + (page + 1) + suffix}>
            {tr({ en: "Next", kn: "ಮುಂದಿನದು", hi: "अगला" })}
          </Link>
        )}
      </nav>
    </>
  );
}
