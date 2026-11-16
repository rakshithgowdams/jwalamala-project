import Link from "next/link";
import { requireStaff } from "@/lib/auth/require-user";
import { getUiStrings } from "@/lib/i18n/server";
import { cached } from "@/lib/admin/dashboard";
import { getAdminClient } from "@/lib/supabase/admin";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  profiles: { full_name: string | null } | null;
  actor_name?: string | null;
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; table?: string }>;
}) {
  const { db, user } = await requireStaff();
  const { tr, locale } = await getUiStrings();
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  const table = query.table?.slice(0, 100) || "";
  // requireStaff() has already checked admin.access, the same test the audit_log
  // read policy runs. Reading with the server client skips re-running that check
  // on every row, which is what made this query time out on a large log.
  const reader = getAdminClient() ?? db;
  // A slow audit read shows a notice instead of hanging the page for the full retry cycle.
  const data = await cached(`audit-v3:${user.id}:${page}:${table}`, async () => {
    let request = reader
      .from("audit_log")
      .select("id,actor_id,action,table_name,record_id,created_at,profiles(full_name)")
      .order("created_at", { ascending: false })
      .range((page - 1) * 50, page * 50 - 1);
    if (table) request = request.eq("table_name", table);
    const { data, error } = await request.abortSignal(AbortSignal.timeout(4000));
    if (error) throw error;
    const rows = (data || []) as unknown as AuditRow[];
    // Accounts without a profile name fall back to their sign-in email.
    const unnamed = [...new Set(rows.filter((r) => r.actor_id && !r.profiles?.full_name?.trim()).map((r) => r.actor_id!))];
    const emails = new Map<string, string>();
    if (reader !== db && unnamed.length)
      await Promise.all(
        unnamed.map(async (id) => {
          const { data } = await reader.auth.admin.getUserById(id);
          if (data.user?.email) emails.set(id, data.user.email);
        }),
      );
    return rows.map((r) => ({
      ...r,
      actor_name: r.profiles?.full_name?.trim() || (r.actor_id ? emails.get(r.actor_id) : null) || null,
    }));
  }).catch(() => null);
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
      {!data && (
        <p role="alert">
          {tr({
            en: "Audit history could not be loaded right now. Reload the page to try again.",
            kn: "ಬದಲಾವಣೆಗಳ ಇತಿಹಾಸವನ್ನು ಈಗ ಲೋಡ್ ಮಾಡಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಲು ಪುಟವನ್ನು ರಿಲೋಡ್ ಮಾಡಿ.",
            hi: "ऑडिट इतिहास अभी लोड नहीं हो सका। दोबारा कोशिश करने के लिए पेज रीलोड करें।",
          })}
        </p>
      )}
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
                <td title={r.actor_id || undefined}>
                  {r.actor_id
                    ? r.actor_name || tr({ en: "Unknown account", kn: "ಅಪರಿಚಿತ ಖಾತೆ", hi: "अज्ञात खाता" })
                    : tr({ en: "System", kn: "ವ್ಯವಸ್ಥೆ", hi: "सिस्टम" })}
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
