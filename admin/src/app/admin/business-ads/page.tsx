import Link from "next/link";
import { site } from "@/config/site";
import { requirePermission } from "@/lib/v4/permissions";
import {
  ResourceEditor,
  type Choice,
} from "@/components/admin/v4/ResourceEditor";
import { businessAdState, type BusinessAdState } from "@/lib/ads/business";
import { getUiStrings } from "@/lib/i18n/server";
import type { Tri } from "@/lib/i18n/strings";

const states: Record<BusinessAdState, Tri> = {
  live: { en: "Live", kn: "ಪ್ರಕಟವಾಗಿದೆ", hi: "प्रकाशित" },
  pending: { en: "Review pending", kn: "ಪರಿಶೀಲನೆ ಬಾಕಿ", hi: "समीक्षा लंबित" },
  paused: { en: "Paused", kn: "ತಡೆಹಿಡಿಯಲಾಗಿದೆ", hi: "रोका गया" },
  rejected: { en: "Rejected", kn: "ನಿರಾಕರಿಸಲಾಗಿದೆ", hi: "अस्वीकृत" },
  unpaid: { en: "Payment pending", kn: "ಪಾವತಿ ಬಾಕಿ", hi: "भुगतान लंबित" },
  scheduled: {
    en: "Not started yet",
    kn: "ಇನ್ನೂ ಆರಂಭವಾಗಿಲ್ಲ",
    hi: "अभी शुरू नहीं हुआ",
  },
  expired: { en: "Expired", kn: "ಅವಧಿ ಮುಗಿದಿದೆ", hi: "समाप्त" },
  undated: { en: "Needs dates", kn: "ದಿನಾಂಕ ಬೇಕು", hi: "तारीख चाहिए" },
};
const checklist: Tri[] = [
  {
    en: "Call the phone/WhatsApp number on the request to confirm the advertiser; get the logo or image, put it on ImageKit and paste the link.",
    kn: "ಅರ್ಜಿಯ ಫೋನ್/WhatsApp ಸಂಖ್ಯೆಗೆ ಕರೆ ಮಾಡಿ ಜಾಹೀರಾತುದಾರರನ್ನು ದೃಢಪಡಿಸಿ; ಲೋಗೋ ಅಥವಾ ಚಿತ್ರವನ್ನು ಪಡೆದು ImageKit ನಲ್ಲಿ ಇರಿಸಿ ಅದರ ಲಿಂಕ್ ಅಂಟಿಸಿ.",
    hi: "आवेदन के फ़ोन/WhatsApp नंबर पर कॉल करके विज्ञापनदाता की पुष्टि करें; लोगो या चित्र लेकर ImageKit पर रखें और उसका लिंक चिपकाएँ।",
  },
  {
    en: "Check that the message and image follow the rules on the /advertise page and do not fall in a category we do not accept. Discounts must state their conditions and validity.",
    kn: "ಸಂದೇಶ ಮತ್ತು ಚಿತ್ರ /advertise ಪುಟದ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸುತ್ತವೆಯೇ, ಸ್ವೀಕರಿಸದ ವಿಭಾಗಕ್ಕೆ ಸೇರಿಲ್ಲವೇ ಎಂದು ಪರಿಶೀಲಿಸಿ. ರಿಯಾಯಿತಿಗೆ ಷರತ್ತು ಮತ್ತು ಮಾನ್ಯತೆ ಇರಲಿ.",
    hi: "जाँचें कि संदेश और चित्र /advertise पेज के नियमों का पालन करते हैं और किसी अस्वीकृत श्रेणी में नहीं आते। छूट के साथ शर्तें और वैधता लिखी हों।",
  },
  {
    en: "Set the start and end dates. To show it only in some districts, pick those districts; left empty, it shows everywhere.",
    kn: "ಆರಂಭ ಮತ್ತು ಮುಕ್ತಾಯ ದಿನಾಂಕ ಹಾಕಿ. ಕೆಲವು ಜಿಲ್ಲೆಗಳಿಗೆ ಮಾತ್ರ ತೋರಿಸಲು ಆ ಜಿಲ್ಲೆಗಳನ್ನು ಆರಿಸಿ; ಖಾಲಿ ಬಿಟ್ಟರೆ ಎಲ್ಲೆಡೆ ಕಾಣಿಸುತ್ತದೆ.",
    hi: "शुरू और समाप्ति की तारीख डालें। केवल कुछ ज़िलों में दिखाने के लिए वे ज़िले चुनें; खाली छोड़ने पर हर जगह दिखेगा।",
  },
  {
    en: "Confirm the payment in the bank/UPI record, then set 'paid' and enter the receipt number; if it is free, use 'waived'.",
    kn: "ಪಾವತಿಯನ್ನು ಬ್ಯಾಂಕ್/UPI ದಾಖಲೆಯಲ್ಲಿ ಖಚಿತಪಡಿಸಿ 'paid' ಮತ್ತು ರಸೀದಿ ಸಂಖ್ಯೆ ದಾಖಲಿಸಿ; ಉಚಿತವಾದರೆ 'waived'.",
    hi: "बैंक/UPI रिकॉर्ड में भुगतान की पुष्टि करके 'paid' और रसीद संख्या दर्ज करें; मुफ़्त हो तो 'waived'।",
  },
  {
    en: "Finally set the status to 'approved'. The ad reaches readers only when approval, payment and dates are all in order.",
    kn: "ಕೊನೆಗೆ ಸ್ಥಿತಿಯನ್ನು 'approved' ಮಾಡಿ. ಅನುಮೋದನೆ, ಪಾವತಿ ಮತ್ತು ದಿನಾಂಕ ಮೂರೂ ಸರಿಯಿದ್ದಾಗ ಮಾತ್ರ ಜಾಹೀರಾತು ಓದುಗರಿಗೆ ಕಾಣಿಸುತ್ತದೆ.",
    hi: "अंत में स्थिति 'approved' करें। अनुमोदन, भुगतान और तारीख तीनों सही होने पर ही विज्ञापन पाठकों को दिखेगा।",
  },
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
  const { kn, v4: t, tr } = await getUiStrings();
  return (
    <>
      <div className="page-heading">
        <h1>
          {tr({
            en: "Local shop ads",
            kn: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು",
            hi: "स्थानीय दुकान विज्ञापन",
          })}
        </h1>
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
        <h2>
          {tr({
            en: "Checks before publishing",
            kn: "ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ಪರಿಶೀಲನೆ",
            hi: "प्रकाशन से पहले जाँच",
          })}
        </h2>
        <ol>
          {checklist.map((item) => (
            <li key={item.en}>{tr(item)}</li>
          ))}
        </ol>
      </section>
      <h2>
        {tr({
          en: "Status and stats (90 days)",
          kn: "ಸ್ಥಿತಿ ಮತ್ತು ಅಂಕಿಅಂಶ (90 ದಿನ)",
          hi: "स्थिति और आँकड़े (90 दिन)",
        })}
      </h2>
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
                  <td>{tr(states[businessAdState(row, now)])}</td>
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
