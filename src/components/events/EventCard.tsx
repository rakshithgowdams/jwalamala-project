"use client";
import Link from "next/link";
import { MapPin, ArrowUpRight } from "lucide-react";
import type { NewsEvent } from "@/lib/types";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
import { usePlaceName } from "@/components/i18n/PlaceNames";
export function EventCard({ event }: { event: NewsEvent }) {
  const { locale, months } = useUiStrings();
  const placeName = usePlaceName();
  return (
    <Link className="event-card" href={`/events/${event.slug}`}>
      <div className="event-date">
        <strong>{Number(event.start_date.slice(8, 10))}</strong>
        <span>{months[Number(event.start_date.slice(5, 7)) - 1]}</span>
      </div>
      <div>
        <h3>{pickText(locale, event.name_kn, event.name_en, event.name_hi)}</h3>
        <span className="meta">
          <MapPin size={13} />
          {placeName(event.place)}
        </span>
      </div>
      <ArrowUpRight size={18} />
    </Link>
  );
}
