import { LazyValueChart as ValueChart } from "@/components/ui/LazyComponents";
import { getUiStrings } from "@/lib/i18n/server";
import { getV4Rows } from "@/lib/v4/queries";
import { AdSlot } from "@/components/ads/AdSlot";
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.reservoirs };
}
export default async function Page() {
  const { v4: t, kn } = await getUiStrings();

  const rows = (await getV4Rows("reservoir_readings")).sort((a, b) =>
    b.reading_date.localeCompare(a.reading_date),
  );
  const slugs = [...new Set(rows.map((r) => r.reservoir_slug))];
  return (
    <div className="container page-shell">
      <h1>{t.reservoirs}</h1>
      <AdSlot placement="reservoirs-top" />
      <div className="community-grid">
        {slugs.map((slug) => {
          const history = rows
              .filter((r) => r.reservoir_slug === slug)
              .slice(0, 30),
            r = history[0];
          return (
            <section className="utility-panel" key={slug}>
              <h2>{r.name_kn}</h2>
              {r.is_seed && <p className="notice">{kn.demoArticle}</p>}
              <p>
                <time>{r.reading_date}</time> · {t.source}: {r.source}
              </p>
              <h3>{r.storage_pct}%</h3>
              <progress
                value={r.storage_pct}
                max={100}
                aria-label={t.storage}
              />
              <p>
                {t.waterLevel}: {r.level_m} / {r.full_level_m} m
              </p>
              <p>
                {t.inflow}: {r.inflow_cusecs} cusecs · {t.outflow}:{" "}
                {r.outflow_cusecs} cusecs
              </p>
              <ValueChart
                label={t.storage}
                unit="%"
                points={history.map((r) => ({
                  date: r.reading_date,
                  value: r.storage_pct,
                }))}
              />
              <table>
                <caption>{t.recentReadings}</caption>
                <thead>
                  <tr>
                    <th>{kn.eventDate}</th>
                    <th>{t.storage}</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td>{row.reading_date}</td>
                      <td>{row.storage_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
      {!rows.length && <p className="notice">{t.noVerifiedData}</p>}
      <AdSlot placement="reservoirs-bottom" />
    </div>
  );
}
