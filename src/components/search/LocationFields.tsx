"use client";
import { useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
import { locationOptions, type LocationFilters } from "@/lib/utils/geography";
import type { Place } from "@/lib/v4/types";

export function LocationFields({
  places,
  filters = {},
}: {
  places: Place[];
  filters?: LocationFilters;
}) {
  const { locale, kn } = useUiStrings();
  const [state, setState] = useState(filters.state || "");
  const [district, setDistrict] = useState(filters.district || "");
  const [city, setCity] = useState(filters.city || "");
  const options = locationOptions(places, state, district);
  return (
    <div className="location-fields">
      <label className="field">
        {kn.state}
        <select
          name="state"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setDistrict("");
            setCity("");
          }}
        >
          <option value="">{kn.all}</option>
          {options.states.map((s) => (
            <option key={s} value={s}>
              {s === "Karnataka" && locale === "kn" ? "ಕರ್ನಾಟಕ" : s}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {kn.district}
        <select
          name="district"
          value={district}
          disabled={!state}
          onChange={(e) => {
            setDistrict(e.target.value);
            setCity("");
          }}
        >
          <option value="">{state ? kn.all : kn.selectStateFirst}</option>
          {options.districts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </label>
      <label className="field">
        {kn.cityOrTown}
        <select
          name="city"
          value={city}
          disabled={!state || !district || !options.cities.length}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">
            {!district
              ? kn.selectDistrictFirst
              : !options.cities.length
                ? kn.noCities
                : kn.all}
          </option>
          {options.cities.map((c) => (
            <option key={c.id} value={c.slug}>
              {pickText(locale, c.name_kn, c.name_en)}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
