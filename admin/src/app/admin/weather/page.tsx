import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";
import { WeatherPlaces } from "@/components/admin/WeatherPlaces";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const { tr } = await getUiStrings();
  const [places, weather, provider] = await Promise.all([
    db
      .from("places")
      .select("id,name_kn,name_en,district,is_district,lat,lng,show_in_weather")
      .order("is_district", { ascending: false })
      .order("name_kn"),
    db.from("weather_snapshots").select("place_id,fetched_at"),
    db
      .from("provider_settings")
      .select("enabled,monthly_limit")
      .eq("id", "weather")
      .maybeSingle(),
  ]);
  return (
    <>
      <h1>
        {tr({
          en: "Weather administration",
          kn: "ಹವಾಮಾನ ನಿರ್ವಹಣೆ",
          hi: "मौसम प्रबंधन",
        })}
      </h1>
      <p>
        {provider.data?.enabled
          ? tr({
              en: "Provider enabled",
              kn: "ಸೇವಾದಾರ ಸಕ್ರಿಯವಾಗಿದೆ",
              hi: "प्रदाता चालू है",
            })
          : tr({
              en: "Provider disabled",
              kn: "ಸೇವಾದಾರ ನಿಷ್ಕ್ರಿಯವಾಗಿದೆ",
              hi: "प्रदाता बंद है",
            })}{" "}
        ·{" "}
        {tr({
          en: "Monthly request budget:",
          kn: "ಮಾಸಿಕ ವಿನಂತಿ ಮಿತಿ:",
          hi: "मासिक अनुरोध सीमा:",
        })}{" "}
        {provider.data?.monthly_limit || 0}
      </p>
      <nav className="tabs">
        <Link href="/admin/providers">
          {tr({
            en: "Provider and budget",
            kn: "ಸೇವಾದಾರ ಮತ್ತು ಮಿತಿ",
            hi: "प्रदाता और सीमा",
          })}
        </Link>
        <Link href="/admin/places">
          {tr({
            en: "Places and coordinates",
            kn: "ಸ್ಥಳಗಳು ಮತ್ತು ನಿರ್ದೇಶಾಂಕಗಳು",
            hi: "स्थान और निर्देशांक",
          })}
        </Link>
        <Link href="/admin/settings">
          {tr({
            en: "Rain threshold settings",
            kn: "ಮಳೆ ಮಿತಿ ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
            hi: "बारिश सीमा सेटिंग",
          })}
        </Link>
      </nav>
      <p>
        {tr({
          en: "Set public setting weather_display to a JSON object with rain_probability_threshold (0–100). Default: 70% within the next six forecast hours.",
          kn: "ಸಾರ್ವಜನಿಕ ಸೆಟ್ಟಿಂಗ್ weather_display ಅನ್ನು rain_probability_threshold (0–100) ಹೊಂದಿರುವ JSON ವಸ್ತುವಾಗಿ ಹೊಂದಿಸಿ. ಡೀಫಾಲ್ಟ್: ಮುಂದಿನ ಆರು ಮುನ್ಸೂಚನೆ ಗಂಟೆಗಳಲ್ಲಿ 70%.",
          hi: "सार्वजनिक सेटिंग weather_display को rain_probability_threshold (0–100) वाले JSON ऑब्जेक्ट पर सेट करें। डिफ़ॉल्ट: अगले छह पूर्वानुमान घंटों में 70%।",
        })}
      </p>
      <WeatherPlaces
        places={(places.data || []).map((p) => ({
          ...p,
          fetched_at: weather.data?.find((w) => w.place_id === p.id)?.fetched_at || null,
        }))}
      />
    </>
  );
}
