"use client";
import Link from "next/link";
import { useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
type Place = {
  id: string;
  slug: string;
  name_kn: string;
  name_en?: string;
  name_hi?: string;
  lat: number | null;
  lng: number | null;
};
export function NearbyBasadis({ places }: { places: Place[] }) {
  const { v4: t, locale } = useUiStrings();
  const [nearby, setNearby] = useState<(Place & { km: number })[]>([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="utility-panel">
      <button
        className="button button-outline"
        disabled={busy}
        onClick={() => {
          if (!navigator.geolocation) {
            setMessage(t.locationFailed);
            return;
          }
          setBusy(true);
          navigator.geolocation.getCurrentPosition(
            (p) => {
              const rad = (v: number) => (v * Math.PI) / 180;
              const rows = places
                .filter((r) => r.lat !== null && r.lng !== null)
                .map((r) => {
                  const a =
                    Math.sin(rad(r.lat! - p.coords.latitude) / 2) ** 2 +
                    Math.cos(rad(p.coords.latitude)) *
                      Math.cos(rad(r.lat!)) *
                      Math.sin(rad(r.lng! - p.coords.longitude) / 2) ** 2;
                  return {
                    ...r,
                    km: 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)),
                  };
                })
                .sort((a, b) => a.km - b.km)
                .slice(0, 6);
              setNearby(rows);
              setMessage(rows.length ? "" : t.dataUnavailable);
              setBusy(false);
            },
            () => {
              setMessage(t.locationFailed);
              setBusy(false);
            },
            { timeout: 10000, maximumAge: 300000 },
          );
        }}
      >
        {busy ? t.loading : t.nearMe}
      </button>
      {nearby.map((r) => (
        <Link className="directory-link" href={"/basadis/" + r.slug} key={r.id}>
          {pickText(locale, r.name_kn, r.name_en, r.name_hi)} ·{" "}
          {r.km.toFixed(1)} km
        </Link>
      ))}
      <p role="status">{message}</p>
    </section>
  );
}
