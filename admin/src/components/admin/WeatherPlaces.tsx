"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Search } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { saveWeatherPlace } from "@/app/admin/weather/actions";

type WeatherPlace = {
  id: string;
  name_kn: string;
  name_en?: string | null;
  district?: string | null;
  is_district?: boolean | null;
  lat: number | null;
  lng: number | null;
  show_in_weather: boolean;
  fetched_at?: string | null;
};

function PlaceRow({ place }: { place: WeatherPlace }) {
  const { tr, l } = useUiStrings();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <tr>
      <td>
        <strong>{place.name_kn}</strong>
        <small className="weather-place-sub">
          {[place.name_en, place.is_district ? tr({ en: "District", kn: "ಜಿಲ್ಲೆ", hi: "ज़िला" }) : place.district]
            .filter(Boolean)
            .join(" · ")}
        </small>
      </td>
      <td colSpan={3}>
        <form
          className="weather-place-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            setBusy(true);
            setMessage("");
            try {
              const result = await saveWeatherPlace({
                id: place.id,
                lat: String(f.get("lat") || "").trim(),
                lng: String(f.get("lng") || "").trim(),
                show_in_weather: f.has("show_in_weather"),
              });
              setMessage(result.error ? l(result.error) : tr({ en: "Saved", kn: "ಉಳಿಸಲಾಗಿದೆ", hi: "सहेजा गया" }));
              if (!result.error) router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          <input
            name="lat"
            inputMode="decimal"
            defaultValue={place.lat ?? ""}
            placeholder={tr({ en: "Latitude", kn: "ಅಕ್ಷಾಂಶ", hi: "अक्षांश" })}
            aria-label={tr({ en: "Latitude", kn: "ಅಕ್ಷಾಂಶ", hi: "अक्षांश" })}
          />
          <input
            name="lng"
            inputMode="decimal"
            defaultValue={place.lng ?? ""}
            placeholder={tr({ en: "Longitude", kn: "ರೇಖಾಂಶ", hi: "देशांतर" })}
            aria-label={tr({ en: "Longitude", kn: "ರೇಖಾಂಶ", hi: "देशांतर" })}
          />
          <label className="weather-place-toggle">
            <input type="checkbox" name="show_in_weather" defaultChecked={place.show_in_weather} />
            {tr({ en: "Show weather", kn: "ಹವಾಮಾನ ತೋರಿಸಿ", hi: "मौसम दिखाएँ" })}
          </label>
          <button className="button button-outline is-compact" disabled={busy}>
            <Save size={15} aria-hidden="true" />
            {tr({ en: "Save", kn: "ಉಳಿಸಿ", hi: "सहेजें" })}
          </button>
          {message && (
            <span className="weather-place-message" role="status">
              {message}
            </span>
          )}
        </form>
      </td>
      <td className="weather-place-fetched">
        {place.fetched_at
          ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(
              new Date(place.fetched_at),
            )
          : tr({ en: "Not fetched yet", kn: "ಇನ್ನೂ ಪಡೆದಿಲ್ಲ", hi: "अभी प्राप्त नहीं" })}
      </td>
    </tr>
  );
}

/** Searchable list of places where each row edits its coordinates and weather switch. */
export function WeatherPlaces({ places }: { places: WeatherPlace[] }) {
  const { tr } = useUiStrings();
  const [query, setQuery] = useState("");
  const [onlyOn, setOnlyOn] = useState(false);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter(
      (p) =>
        (!onlyOn || p.show_in_weather) &&
        (!q ||
          p.name_kn.includes(query.trim()) ||
          (p.name_en || "").toLowerCase().includes(q) ||
          (p.district || "").includes(query.trim())),
    );
  }, [places, query, onlyOn]);
  const enabled = places.filter((p) => p.show_in_weather).length;

  return (
    <section className="weather-places">
      <div className="filter-bar weather-filter">
        <label className="field">
          {tr({ en: "Find a place", kn: "ಸ್ಥಳ ಹುಡುಕಿ", hi: "स्थान खोजें" })}
          <span className="weather-search">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr({ en: "Kannada or English name, or district", kn: "ಕನ್ನಡ/ಇಂಗ್ಲಿಷ್ ಹೆಸರು ಅಥವಾ ಜಿಲ್ಲೆ", hi: "कन्नड़/अंग्रेज़ी नाम या ज़िला" })}
            />
          </span>
        </label>
        <label className="weather-place-toggle">
          <input type="checkbox" checked={onlyOn} onChange={(e) => setOnlyOn(e.target.checked)} />
          {tr({ en: `Only places with weather on (${enabled})`, kn: `ಹವಾಮಾನ ಆನ್ ಇರುವ ಸ್ಥಳಗಳು ಮಾತ್ರ (${enabled})`, hi: `केवल मौसम चालू वाले स्थान (${enabled})` })}
        </label>
      </div>
      <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{tr({ en: "Place", kn: "ಸ್ಥಳ", hi: "स्थान" })}</th>
              <th colSpan={3}>
                {tr({ en: "Coordinates and weather", kn: "ನಿರ್ದೇಶಾಂಕಗಳು ಮತ್ತು ಹವಾಮಾನ", hi: "निर्देशांक और मौसम" })}
              </th>
              <th>{tr({ en: "Last fetched", kn: "ಕೊನೆಯ ಪಡೆಯುವಿಕೆ", hi: "अंतिम प्राप्ति" })}</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((place) => (
              <PlaceRow key={place.id} place={place} />
            ))}
            {!shown.length && (
              <tr>
                <td colSpan={5} className="table-empty">
                  {tr({ en: "No place matches.", kn: "ಯಾವುದೇ ಸ್ಥಳ ಹೊಂದುತ್ತಿಲ್ಲ.", hi: "कोई स्थान मेल नहीं खाता।" })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
