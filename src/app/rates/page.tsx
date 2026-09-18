import { LazyValueChart as ValueChart } from "@/components/ui/LazyComponents";
import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import { getV4Rows } from "@/lib/v4/queries";
import { AdSlot } from "@/components/ads/AdSlot";
const commodityLabels = {
  kn: {
    gold22: "ಚಿನ್ನ 22K",
    gold24: "ಚಿನ್ನ 24K",
    silver: "ಬೆಳ್ಳಿ",
    petrol: "ಪೆಟ್ರೋಲ್",
    diesel: "ಡೀಸೆಲ್",
  },
  en: {
    gold22: "Gold 22K",
    gold24: "Gold 24K",
    silver: "Silver",
    petrol: "Petrol",
    diesel: "Diesel",
  },
  hi: {
    gold22: "सोना 22K",
    gold24: "सोना 24K",
    silver: "चांदी",
    petrol: "पेट्रोल",
    diesel: "डीज़ल",
  },
};
export async function generateMetadata() {
  const { v4: t } = await getUiStrings();
  return { title: t.rates };
}
export default async function Page() {
  const { v4: t, locale } = await getUiStrings();
  const labels = commodityLabels[locale];
  const placeName = (place?: { name_kn: string; name_en: string }) =>
    place ? pickText(locale, place.name_kn, place.name_en) : "—";
  const places = await getV4Rows("places");
  const rows = (await getV4Rows("market_rates")).sort((a, b) =>
    b.rate_date.localeCompare(a.rate_date),
  );
  return (
    <div className="container page-shell">
      <h1>{t.rates}</h1>
      <AdSlot placement="rates-top" />
      <p>{t.rateDisclaimer}</p>
      {!rows.length ? (
        <p className="notice">{t.noVerifiedData}</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t.contentType}</th>
                <th>{t.price}</th>
                <th>{t.source}</th>
                <th>{t.updated}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {labels[r.kind]} ·{" "}
                    {placeName(places.find((p) => p.id === r.place_id))}
                  </td>
                  <td>
                    ₹{r.value.toLocaleString("en-IN")} / {r.unit}
                  </td>
                  <td>{r.source}</td>
                  <td>{r.rate_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {[...new Set(rows.map((r) => r.kind + ":" + (r.place_id || "")))].map(
        (key) => {
          const history = rows
            .filter((r) => r.kind + ":" + (r.place_id || "") === key)
            .slice(0, 30);
          const current = history[0];
          const previous = history[1];
          return (
            <section className="utility-panel" key={key}>
              <h2>
                {labels[current.kind]} ·{" "}
                {placeName(places.find((p) => p.id === current.place_id))}
              </h2>
              {previous && (
                <p>
                  ₹{(current.value - previous.value).toFixed(2)} ·{" "}
                  {previous.rate_date} → {current.rate_date}
                </p>
              )}
              <ValueChart
                label={labels[current.kind]}
                unit={current.unit}
                points={history.map((r) => ({
                  date: r.rate_date,
                  value: r.value,
                }))}
              />
            </section>
          );
        },
      )}
      <AdSlot placement="rates-bottom" />
    </div>
  );
}
