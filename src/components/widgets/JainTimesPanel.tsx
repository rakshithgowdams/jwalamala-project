import { getUiStrings } from "@/lib/i18n/server";
import { pickText } from "@/lib/i18n/content";
import Link from "next/link";
import { Sunrise, Sunset } from "lucide-react";
import { getV4Rows } from "@/lib/v4/queries";
import { getSetting } from "@/lib/v4/settings";
import { dailyTimes, istTime, jainRulesSchema } from "@/lib/jain/times";
import { isoToday, formatDate } from "@/lib/utils/dates";

export async function JainTimesPanel({
  placeSlug = "bengaluru-urban",
  date = isoToday(),
}: {
  placeSlug?: string;
  date?: string;
}) {
  const { v4: t, locale } = await getUiStrings();

  const place = (await getV4Rows("places")).find(
    (place) => place.slug === placeSlug,
  );
  const parsed = jainRulesSchema.safeParse(await getSetting("jain_times"));
  const times =
    place && place.lat !== null && place.lng !== null
      ? dailyTimes(
          date,
          place.lat,
          place.lng,
          parsed.success ? parsed.data : undefined,
        )
      : null;
  return (
    <section className="utility-panel">
      <div className="section-title">
        <h2>{t.dailyTimes}</h2>
        <Link className="chip" href={"/jain-calendar?place=" + placeSlug}>
          {t.jainCalendar}
        </Link>
      </div>
      <p className="meta">
        {place && pickText(locale, place.name_kn, place.name_en)} ·{" "}
        {formatDate(date, false, locale)}
      </p>
      {times ? (
        <div className="utility-grid">
          <div className="stat-tile">
            <Sunrise size={23} />
            <span>{t.sunrise}</span>
            <strong>{istTime(times.sunrise)}</strong>
          </div>
          <div className="stat-tile">
            <Sunset size={23} />
            <span>{t.sunset}</span>
            <strong>{istTime(times.sunset)}</strong>
          </div>
          {times.observances.map((item) => (
            <div className="stat-tile" key={item.name}>
              <span>{item.name}</span>
              <strong>{istTime(item.time)}</strong>
            </div>
          ))}
        </div>
      ) : (
        <p>{t.dataUnavailable}</p>
      )}
      {(!parsed.success || !parsed.data.approved) && (
        <p className="meta">{t.observancePending}</p>
      )}
      <p className="meta">{t.timeNote}</p>
    </section>
  );
}
