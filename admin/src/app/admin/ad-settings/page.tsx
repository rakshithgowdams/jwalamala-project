import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import { AdControls } from "@/components/admin/v4/AdControls";
import {
  adSettingsSchema,
  defaultAds,
  type SlotConfig,
} from "@/lib/ads/schema";
import { v4 as t } from "@/content/strings.kn";
export default async function Page() {
  const { db } = await requirePermission("ads.manage");
  const [settings, slots, stats] = await Promise.all([
    db.from("site_settings").select("value").eq("key", "ads").maybeSingle(),
    db.from("ad_slots").select("*").order("slot_key"),
    db
      .from("ad_stats_daily")
      .select("*")
      .order("day", { ascending: false })
      .limit(500),
  ]);
  if (slots.error) throw Error("Ads migration required");
  return (
    <>
      <h1>{t.adSlots}</h1>
      <div className="article-actions">
        <Link href="/admin/v4/ads" className="button button-outline">
          {t.creatives}
        </Link>
        <Link href="/admin/v4/ad_campaigns" className="button button-outline">
          {t.campaigns}
        </Link>
        <Link href="/admin/posters" className="button button-outline">
          ಪೋಸ್ಟರ್/ಬ್ಯಾನರ್ ಜಾಹೀರಾತು
        </Link>
        <Link href="/admin/business-ads" className="button button-outline">
          ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು
        </Link>
        <a
          download
          href="/api/admin/ad-report"
          className="button button-outline"
        >
          {t.exportCsv}
        </a>
      </div>
      <AdControls
        settings={adSettingsSchema
          .catch(defaultAds)
          .parse(settings.data?.value || defaultAds)}
        slots={(slots.data || []) as SlotConfig[]}
        cspReady={process.env.ADS_STRICT_CSP === "true"}
      />
      <h2>{t.adReport}</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.adSlots}</th>
              <th>{t.updated}</th>
              <th>{t.impressions}</th>
              <th>{t.clicks}</th>
              <th>CTR</th>
            </tr>
          </thead>
          <tbody>
            {(stats.data || []).map((r, i) => (
              <tr key={i}>
                <td>{r.slot_key}</td>
                <td>{r.day}</td>
                <td>{r.impressions}</td>
                <td>{r.clicks}</td>
                <td>
                  {r.impressions
                    ? ((r.clicks / r.impressions) * 100).toFixed(2)
                    : "0.00"}
                  %
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
