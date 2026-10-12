import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import { LazyValueChart as ValueChart } from "@/components/ui/LazyComponents";
import { getUiStrings } from "@/lib/i18n/server";
import { z } from "zod";
function reportStart() {
  return new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ post?: string }>;
}) {
  const { db } = await requirePermission("analytics.read");
  const { tr } = await getUiStrings();
  const id = (await searchParams).post;
  const { data: posts } = await db
    .from("posts")
    .select("id,title_kn")
    .order("published_at", { ascending: false })
    .limit(200);
  const selected = z.uuid().safeParse(id).success ? id : posts?.[0]?.id;
  const since = reportStart();
  const { data: rows, error } = selected
    ? await db
        .from("post_engagement_daily")
        .select("*")
        .eq("post_id", selected)
        .gte("day", since)
        .order("day")
    : { data: [], error: null };
  if (error) throw error;
  const values = rows || [];
  const total = (key: string) =>
    values.reduce((sum, r) => sum + Number(r[key] || 0), 0);
  return (
    <>
      <h1>
        {tr({
          en: "Article performance · 30 days",
          kn: "ಲೇಖನದ ಸಾಧನೆ · 30 ದಿನಗಳು",
          hi: "लेख का प्रदर्शन · 30 दिन",
        })}
      </h1>
      <Link className="chip" href="/admin/analytics/live">
        {tr({
          en: "Live readers",
          kn: "ಈಗಿನ ಓದುಗರು",
          hi: "लाइव पाठक",
        })}
      </Link>
      <form method="get" className="form-grid">
        <label className="field wide">
          {tr({ en: "Article", kn: "ಲೇಖನ", hi: "लेख" })}
          <select name="post" defaultValue={selected}>
            {posts?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title_kn}
              </option>
            ))}
          </select>
        </label>
        <button className="button button-outline">
          {tr({
            en: "View report",
            kn: "ವರದಿ ನೋಡಿ",
            hi: "रिपोर्ट देखें",
          })}
        </button>
      </form>
      <div className="utility-grid">
        {[
          [tr({ en: "Views", kn: "ವೀಕ್ಷಣೆಗಳು", hi: "व्यू" }), total("views")],
          [
            tr({
              en: "Engaged seconds",
              kn: "ತೊಡಗಿಸಿಕೊಂಡ ಸೆಕೆಂಡುಗಳು",
              hi: "जुड़ाव के सेकंड",
            }),
            total("engaged_seconds"),
          ],
          [
            tr({ en: "Shares", kn: "ಹಂಚಿಕೆಗಳು", hi: "शेयर" }),
            total("share_clicks"),
          ],
          [
            tr({ en: "Listens", kn: "ಆಲಿಕೆಗಳು", hi: "सुना गया" }),
            total("listen_plays"),
          ],
        ].map(([label, value]) => (
          <div className="stat-tile" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      {values.length > 0 ? (
        <>
          <ValueChart
            label={tr({
              en: "Daily views",
              kn: "ದಿನನಿತ್ಯದ ವೀಕ್ಷಣೆಗಳು",
              hi: "दैनिक व्यू",
            })}
            unit={tr({ en: "views", kn: "ವೀಕ್ಷಣೆಗಳು", hi: "व्यू" })}
            points={values.map((r) => ({
              date: r.day,
              value: Number(r.views),
            }))}
          />
          <ValueChart
            label={tr({
              en: "Engaged reading",
              kn: "ತೊಡಗಿಸಿಕೊಂಡ ಓದು",
              hi: "जुड़ाव के साथ पढ़ना",
            })}
            unit={tr({ en: "seconds", kn: "ಸೆಕೆಂಡುಗಳು", hi: "सेकंड" })}
            points={values.map((r) => ({
              date: r.day,
              value: Number(r.engaged_seconds),
            }))}
          />
        </>
      ) : (
        <p>
          {tr({
            en: "No recorded activity in this period.",
            kn: "ಈ ಅವಧಿಯಲ್ಲಿ ಯಾವುದೇ ಚಟುವಟಿಕೆ ದಾಖಲಾಗಿಲ್ಲ.",
            hi: "इस अवधि में कोई गतिविधि दर्ज नहीं हुई।",
          })}
        </p>
      )}
      <div className="utility-grid">
        {["scroll_25", "scroll_50", "scroll_75", "scroll_100"].map((k) => (
          <div className="stat-tile" key={k}>
            <span>
              {tr({ en: "Scroll", kn: "ಸ್ಕ್ರೋಲ್", hi: "स्क्रॉल" }) +
                " " +
                k.replace("scroll_", "") +
                "%"}
            </span>
            <strong>{total(k)}</strong>
          </div>
        ))}
      </div>
      <a
        className="button button-outline"
        href="/api/admin/analytics-report"
        download
      >
        {tr({
          en: "Export report",
          kn: "ವರದಿ ರಫ್ತು ಮಾಡಿ",
          hi: "रिपोर्ट निर्यात करें",
        })}
      </a>
    </>
  );
}
