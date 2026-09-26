"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Place } from "@/lib/v4/types";
export function PlacePicker({
  places,
  selected,
  path = "/weather",
}: {
  places: Place[];
  selected: string;
  path?: string;
}) {
  const { kn, v4: t, locale } = useUiStrings();

  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function choose(slug: string) {
    document.cookie =
      "jwalamala-place=" +
      encodeURIComponent(slug) +
      "; Path=/; Max-Age=31536000; SameSite=Lax";
    try {
      localStorage.setItem("jwalamala-place", slug);
    } catch {}
    router.push(path + "?place=" + encodeURIComponent(slug));
  }
  function locate() {
    if (!navigator.geolocation) {
      setMessage(t.dataUnavailable);
      return;
    }
    setBusy(true);
    setMessage("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const available = places.filter(
          (place): place is Place & { lat: number; lng: number } =>
            place.lat !== null && place.lng !== null,
        );
        const rad = (x: number) => (x * Math.PI) / 180;
        const distance = (place: Place & { lat: number; lng: number }) =>
          Math.sin(rad(place.lat - position.coords.latitude) / 2) ** 2 +
          Math.cos(rad(place.lat)) *
            Math.cos(rad(position.coords.latitude)) *
            Math.sin(rad(place.lng - position.coords.longitude) / 2) ** 2;
        const nearest = available.sort((a, b) => distance(a) - distance(b))[0];
        if (nearest) choose(nearest.slug);
        else setMessage(t.dataUnavailable);
        setBusy(false);
      },
      () => {
        setMessage(t.locationFailed);
        setBusy(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
  return (
    <div className="public-filter">
      <label className="field">
        {t.choosePlace}
        <select
          value={selected}
          onChange={(event) => choose(event.target.value)}
        >
          {places.map((place) => (
            <option value={place.slug} key={place.id}>
              {pickText(locale, place.name_kn, place.name_en, place.name_hi)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button button-outline"
        disabled={busy}
        onClick={locate}
      >
        {busy ? t.loading : t.nearMe}
      </button>
      <button
        type="button"
        className="chip"
        onClick={() => {
          try {
            const value = localStorage.getItem("jwalamala-place");
            if (value && places.some((place) => place.slug === value))
              choose(value);
          } catch {}
        }}
      >
        {t.savedPlace}
      </button>
      {message && <p role="status">{message}</p>}
      <LinkPlaceholder label={kn.place} />
    </div>
  );
}
function LinkPlaceholder({ label }: { label: string }) {
  return <span className="sr-only">{label}</span>;
}
