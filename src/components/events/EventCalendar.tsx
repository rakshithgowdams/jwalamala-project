"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NewsEvent } from "@/lib/types";
import { EventCard } from "./EventCard";
export function EventCalendar({
  events,
  initialMonth,
}: {
  events: NewsEvent[];
  initialMonth: string;
}) {
  const { kn, months, weekdays } = useUiStrings();

  const [month, setMonth] = useState(initialMonth),
    [selected, setSelected] = useState("");
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1).getDay(),
    days = new Date(y, m, 0).getDate();
  function move(delta: number) {
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"));
    setSelected("");
  }
  const visible = events.filter((e) =>
    selected
      ? e.start_date <= selected && e.end_date >= selected
      : e.start_date.slice(0, 7) <= month && e.end_date.slice(0, 7) >= month,
  );
  return (
    <div className="calendar-layout">
      <div className="calendar">
        <div className="calendar-header">
          <button
            className="icon-button"
            aria-label={kn.previous}
            onClick={() => move(-1)}
          >
            <ChevronLeft />
          </button>
          <h2>
            {months[m - 1]} {y}
          </h2>
          <button
            className="icon-button"
            aria-label={kn.next}
            onClick={() => move(1)}
          >
            <ChevronRight />
          </button>
        </div>
        <div className="calendar-grid">
          {weekdays.map((w) => (
            <div className="weekday" key={w}>
              {w}
            </div>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <span key={"blank" + i} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const day = month + "-" + String(i + 1).padStart(2, "0");
            const has = events.some(
              (e) => e.start_date <= day && e.end_date >= day,
            );
            return (
              <button
                key={day}
                className={`calendar-day ${has ? "has-event" : ""} ${selected === day ? "selected" : ""}`}
                aria-label={day}
                aria-pressed={selected === day}
                onClick={() => setSelected(selected === day ? "" : day)}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      <section className="event-list">
        <h2>{selected || kn.monthEvents}</h2>
        {visible.length ? (
          visible.map((e) => <EventCard key={e.id} event={e} />)
        ) : (
          <p className="notice">{kn.noEvents}</p>
        )}
        {selected && (
          <button
            className="button button-outline"
            onClick={() => setSelected("")}
          >
            {kn.clear}
          </button>
        )}
      </section>
    </div>
  );
}
