import { requirePermission } from "@/lib/v4/permissions";
import { PushComposer } from "@/components/admin/v4/PushComposer";
import { PushDelete } from "@/components/admin/PushDelete";
import { getUiStrings } from "@/lib/i18n/server";
import { getAdminClient } from "@/lib/supabase/admin";
export default async function Page() {
  const { db } = await requirePermission("content.publish");
  const { tr } = await getUiStrings();
  const [posts, campaigns] = await Promise.all([
    db
      .from("posts")
      .select("id,title_kn,summary_kn")
      .eq("status", "published")
      .eq("is_seed", false)
      .order("published_at", { ascending: false })
      .limit(100),
    db
      .from("push_campaigns")
      .select("id,title,body,topic,created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  // Delivery rows are not readable by the editor's session; counts only, after the permission check.
  const ids = (campaigns.data || []).map((c) => c.id);
  const admin = getAdminClient();
  const deliveries =
    admin && ids.length
      ? (await admin.from("push_deliveries").select("campaign_id,status").in("campaign_id", ids)).data || []
      : [];
  const count = (id: string, status: string) =>
    deliveries.filter((d) => d.campaign_id === id && d.status === status).length;
  return (
    <>
      <h1>{tr({ en: "Notifications", kn: "ಅಧಿಸೂಚನೆಗಳು", hi: "सूचनाएँ" })}</h1>
      <p>
        {tr({
          en: "Sent only to readers who gave permission. Quiet hours and the daily limit are respected.",
          kn: "ಅನುಮತಿ ನೀಡಿದ ಓದುಗರಿಗೆ ಮಾತ್ರ ಕಳುಹಿಸಲಾಗುತ್ತದೆ. ಶಾಂತ ಸಮಯ ಮತ್ತು ದಿನದ ಮಿತಿಯನ್ನು ಪಾಲಿಸಲಾಗುತ್ತದೆ.",
          hi: "केवल अनुमति देने वाले पाठकों को भेजी जाती हैं। शांत समय और दैनिक सीमा का पालन किया जाता है।",
        })}
      </p>
      <PushComposer posts={posts.data || []} />
      <h2>
        {tr({
          en: "Notifications approved for sending",
          kn: "ಕಳುಹಿಸಲು ಅನುಮೋದಿಸಿದ ಅಧಿಸೂಚನೆಗಳು",
          hi: "भेजने के लिए स्वीकृत सूचनाएँ",
        })}
      </h2>
      <p>
        {tr({
          en: "Deleting a notification cancels the deliveries that have not gone out yet.",
          kn: "ಅಧಿಸೂಚನೆಯನ್ನು ಅಳಿಸಿದರೆ ಇನ್ನೂ ಕಳುಹಿಸದವು ರದ್ದಾಗುತ್ತವೆ.",
          hi: "सूचना हटाने से जो अभी नहीं भेजी गईं, वे रद्द हो जाती हैं।",
        })}
      </p>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{tr({ en: "Notification", kn: "ಅಧಿಸೂಚನೆ", hi: "सूचना" })}</th>
              <th>{tr({ en: "Topic", kn: "ವಿಷಯ", hi: "विषय" })}</th>
              <th>{tr({ en: "Created", kn: "ರಚಿಸಿದ್ದು", hi: "बनाई गई" })}</th>
              <th>{tr({ en: "Waiting · Sent · Failed", kn: "ಬಾಕಿ · ಕಳುಹಿಸಿದ್ದು · ವಿಫಲ", hi: "बाकी · भेजी · विफल" })}</th>
              <th>{tr({ en: "Actions", kn: "ಕ್ರಿಯೆಗಳು", hi: "कार्रवाई" })}</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.data?.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.title}</strong>
                  <small className="weather-place-sub">{c.body}</small>
                </td>
                <td>
                  <span className="status-pill">{c.topic}</span>
                </td>
                <td>
                  {new Intl.DateTimeFormat("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Kolkata",
                  }).format(new Date(c.created_at))}
                </td>
                <td>
                  {count(c.id, "pending") + count(c.id, "sending")} · {count(c.id, "sent")} · {count(c.id, "failed")}
                </td>
                <td>
                  <PushDelete id={c.id} />
                </td>
              </tr>
            ))}
            {!campaigns.data?.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  {tr({
                    en: "No notifications yet. Prepare one above.",
                    kn: "ಇನ್ನೂ ಯಾವುದೇ ಅಧಿಸೂಚನೆ ಇಲ್ಲ. ಮೇಲೆ ಸಿದ್ಧಪಡಿಸಿ.",
                    hi: "अभी कोई सूचना नहीं। ऊपर तैयार करें।",
                  })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
