"use client";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";
import { MapPin, Search, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { indexPlaces, searchPlaces, type PlaceOption } from "@/lib/places/search";

/**
 * Searchable single place choice that submits the place id under `name`.
 * Pass `value` and `onChange` to control it, or `defaultValue` alone.
 */
export function PlacePicker({
  name,
  label,
  places,
  value,
  defaultValue = "",
  onChange,
}: {
  name: string;
  label: ReactNode;
  places: PlaceOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (place: PlaceOption | null) => void;
}) {
  const { tr } = useUiStrings();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inner, setInner] = useState(defaultValue);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selectedId = value ?? inner;
  const index = useMemo(() => indexPlaces(places), [places]);
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const englishDistrict = useMemo(
    () => new Map(places.filter((p) => p.is_district).map((p) => [p.name_kn, p.name_en || ""])),
    [places],
  );
  const results = useMemo(() => searchPlaces(index, query), [index, query]);
  const selected = byId.get(selectedId) || null;

  const describe = (place: PlaceOption) => {
    if (place.is_district) return tr({ en: "District", kn: "ಜಿಲ್ಲೆ", hi: "ज़िला" });
    if (!place.district) return "";
    const english = englishDistrict.get(place.district) || place.district;
    return tr({
      en: `${english} district`,
      kn: `${place.district} ಜಿಲ್ಲೆ`,
      hi: `${english} ज़िला`,
    });
  };
  const title = (place: PlaceOption) =>
    [place.name_kn, place.name_en].filter(Boolean).join(" · ");

  function choose(place: PlaceOption | null) {
    setInner(place?.id || "");
    onChange?.(place);
    setQuery("");
    setOpen(false);
  }

  function openList() {
    setQuery("");
    setActive(0);
    setOpen(true);
  }

  return (
    <div className="field place-picker">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={selectedId} />
      <div className="place-picker-control">
        <Search size={16} aria-hidden="true" className="place-picker-icon" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `${id}-${results[active].id}` : undefined}
          placeholder={tr({
            en: "Search district or town in Kannada or English",
            kn: "ಜಿಲ್ಲೆ ಅಥವಾ ಊರನ್ನು ಕನ್ನಡ/ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಹುಡುಕಿ",
            hi: "ज़िला या शहर कन्नड़ या अंग्रेज़ी में खोजें",
          })}
          value={open ? query : selected ? title(selected) : ""}
          onFocus={openList}
          onClick={() => !open && openList()}
          onBlur={() => setOpen(false)}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              if (!open) return openList();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((current) => (current + step + results.length) % Math.max(results.length, 1));
            } else if (e.key === "Enter" && open) {
              e.preventDefault();
              if (results[active]) choose(results[active]);
            } else if (e.key === "Escape" && open) {
              e.preventDefault();
              setOpen(false);
            }
          }}
        />
        {selected && !open && (
          <button
            type="button"
            className="place-picker-clear"
            aria-label={tr({ en: "Clear place", kn: "ಸ್ಥಳ ತೆರವುಗೊಳಿಸಿ", hi: "स्थान हटाएँ" })}
            onClick={() => {
              choose(null);
              inputRef.current?.focus();
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {open && (
        <ul className="place-picker-list" id={`${id}-list`} role="listbox">
          {results.length ? (
            results.map((place, i) => (
              <li
                key={place.id}
                id={`${id}-${place.id}`}
                role="option"
                aria-selected={place.id === selectedId}
                className={
                  "place-picker-option" +
                  (i === active ? " is-active" : "") +
                  (place.id === selectedId ? " is-selected" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  choose(place);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <MapPin size={15} aria-hidden="true" />
                <span>
                  <strong>{title(place)}</strong>
                  <small>{describe(place)}</small>
                </span>
              </li>
            ))
          ) : (
            <li className="place-picker-empty">
              {tr({ en: "No district or town found", kn: "ಯಾವುದೇ ಜಿಲ್ಲೆ ಅಥವಾ ಊರು ಸಿಗಲಿಲ್ಲ", hi: "कोई ज़िला या शहर नहीं मिला" })}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
