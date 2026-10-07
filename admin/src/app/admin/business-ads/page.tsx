import Link from "next/link";
import { site } from "@/config/site";
import { requirePermission } from "@/lib/v4/permissions";
import {
  ResourceEditor,
  type Choice,
} from "@/components/admin/v4/ResourceEditor";
import { businessAdState, type BusinessAdState } from "@/lib/ads/business";
import { kn, v4 as t } from "@/content/strings.kn";

const states: Record<BusinessAdState, string> = {
  live: "ಪ್ರಕಟವಾಗಿದೆ",
  pending: "ಪರಿಶೀಲನೆ ಬಾಕಿ",
  paused: "ತಡೆಹಿಡಿಯಲಾಗಿದೆ",
  rejected: "ನಿರಾಕರಿಸಲಾಗಿದೆ",
  unpaid: "ಪಾವತಿ ಬಾಕಿ",
  scheduled: "ಇನ್ನೂ ಆರಂಭವಾಗಿಲ್ಲ",
  expired: "ಅವಧಿ ಮುಗಿದಿದೆ",
  undated: "ದಿನಾಂಕ ಬೇಕು",
};
const checklist = [
  "ಅರ್ಜಿಯ ಫೋನ್/WhatsApp ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ ಜಾಹೀರಾತುದಾರರನ್ನು ದೃಢಪಡಿಸಿ; ಲೋಗೋ ಅಥವಾ ಚಿತ್ರವನ್ನು ಪಡೆದು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ.",
  "ಸಂದೇಶ ಮತ್ತು ಚಿತ್ರ /advertise ಪುಟದ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸುತ್ತವೆಯೇ, ಸ್ವೀಕರಿಸದ ವಿಭಾಗಕ್ಕೆ ಸೇರಿಲ್ಲವೇ ಎಂದು ಪರಿಶೀಲಿಸಿ. ರಿಯಾಯಿತಿಗೆ ಷರತ್ತು ಮತ್ತು ಮಾನ್ಯತೆ ಇರಲಿ.",
  "ಆರಂಭ ಮತ್ತು ಮುಕ್ತಾಯ ದಿನಾಂಕ ಹಾಕಿ. ಕೆಲವು ಜಿಲ್ಲೆಗಳಿಗೆ ಮಾತ್ರ ತೋರಿಸಲು ಆ ಜಿಲ್ಲೆಗಳನ್ನು ಆರಿಸಿ; ಖಾಲಿ ಬಿಟ್ಟರೆ ಎಲ್ಲೆಡೆ ಕಾಣಿಸುತ್ತದೆ.",
  "ಪಾವತಿಯನ್ನು ಬ್ಯಾಂಕ್/UPI ದಾಖಲೆಯಲ್ಲಿ ಖಚಿತಪಡಿಸಿ 'paid' ಮತ್ತು ರಸೀದಿ ಸಂಖ್ಯೆ ದಾಖಲಿಸಿ; ಉಚಿತವಾದರೆ 'waived'.",
  "ಕೊನೆಗೆ ಸ್ಥಿತಿಯನ್ನು 'approved' ಮಾಡಿ. ಅನುಮೋದನೆ, ಪಾವತಿ ಮತ್ತು ದಿನಾಂಕ ಮೂರೂ ಸರಿಯಿದ್ದಾಗ ಮಾತ್ರ ಜಾಹೀರಾತು ಓದುಗರಿಗೆ ಕಾಣಿಸುತ್ತದೆ.",
];

async function load() {
  const { db } = await requirePermission("ads.manage");
  const now = Date.now();
  const since = new Date(now - 90 * 86400000).toISOString().slice(0, 10);
  const [ads, places, stats] = await Promise.all([
    db
      .from("business_ads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    db.from("places").select("id,name_kn").order("name_kn").limit(1000),
    db
      .from("business_ad_stats_daily")
      .select("ad_id,impressions,clicks")
      .gte("day", since)
      .limit(10000),
  ]);
  if (ads.error) throw new Error("Business ads migration required");
  const totals = new Map<string, { impressions: number; clicks: number }>();
  for (const row of stats.data || []) {
    const total = totals.get(row.ad_id) || { impressions: 0, clicks: 0 };
    total.impressions += Number(row.impressions);
    total.clicks += Number(row.clicks);
    totals.set(row.ad_id, total);
  }
  const choices: Record<string, Choice[]> = {
    places: (places.data || []).map((row) => ({
      id: String(row.id),
      label: String(row.name_kn),
    })),
  };
  return { rows: ads.data || [], totals, choices, now };
}

export default async function Page() {
  const { rows, totals, choices, now } = await load();
  return (
    <>
      <div className="page-heading">
        <h1>ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು</h1>
      </div>
      <div className="article-actions">
        <a href={site.url + "/advertise"} className="button button-outline">
          /advertise
        </a>
        <a href={site.url + "/local-shops"} className="button button-outline">
          /local-shops
        </a>
        <Link href="/admin/ad-settings" className="button button-outline">
          {t.adSlots}
        </Link>
      </div>
      <section className="utility-panel">
        <h2>ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ಪರಿಶೀಲನೆ</h2>
        <ol>
          {checklist.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </section>
      <h2>ಸ್ಥಿತಿ ಮತ್ತು ಅಂಕಿಅಂಶ (90 ದಿನ)</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{kn.name}</th>
              <th>{kn.status}</th>
              <th>{t.start}</th>
              <th>{t.end}</th>
              <th>{t.impressions}</th>
              <th>{t.clicks}</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const total = totals.get(row.id) || {
                impressions: 0,
                clicks: 0,
              };
              return (
                <tr key={row.id}>
                  <td>{row.name_kn}</td>
                  <td>{states[businessAdState(row, now)]}</td>
                  <td>{row.starts_at?.slice(0, 10) || "—"}</td>
                  <td>{row.ends_at?.slice(0, 10) || "—"}</td>
                  <td>{total.impressions}</td>
                  <td>{total.clicks}</td>
                  <td>
                    {total.impressions
                      ? ((total.clicks / total.impressions) * 100).toFixed(2)
                      : "0.00"}
                    %
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ResourceEditor
        resource="business_ads"
        rows={rows}
        choices={choices}
        relationships={[]}
      />
    </>
  );
}
