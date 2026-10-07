import Link from "next/link";
import { requirePermission } from "@/lib/v4/permissions";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const [places, weather, provider] = await Promise.all([
    db
      .from("places")
      .select("id,name_kn,lat,lng,show_in_weather")
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
      <h1>Weather administration</h1>
      <p>
        {provider.data?.enabled ? "Provider enabled" : "Provider disabled"} ·
        Monthly request budget: {provider.data?.monthly_limit || 0}
      </p>
      <nav className="tabs">
        <Link href="/admin/providers">Provider and budget</Link>
        <Link href="/admin/places">Places and coordinates</Link>
        <Link href="/admin/settings">Rain threshold settings</Link>
      </nav>
      <p>
        Set public setting weather_display to a JSON object with
        rain_probability_threshold (0–100). Default: 70% within the next six
        forecast hours.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Place</th>
              <th>Coordinates</th>
              <th>Enabled</th>
              <th>Last fetch</th>
            </tr>
          </thead>
          <tbody>
            {places.data?.map((p) => (
              <tr key={p.id}>
                <td>{p.name_kn}</td>
                <td>
                  {p.lat != null && p.lng != null
                    ? p.lat + ", " + p.lng
                    : "Awaiting verified coordinates"}
                </td>
                <td>{p.show_in_weather ? "Yes" : "No"}</td>
                <td>
                  {weather.data?.find((w) => w.place_id === p.id)?.fetched_at ||
                    "No snapshot"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
