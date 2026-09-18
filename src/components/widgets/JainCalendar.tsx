"use client";
import { CalendarReminder } from "@/components/engagement/CalendarReminder";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarDay } from "@/lib/v4/types";
export function JainCalendar({
  days,
  initialMonth,
}: {
  days: CalendarDay[];
  initialMonth: string;
}) {
  const { kn, v4: t, months, weekdays } = useUiStrings();

  const [month, setMonth] = useState(initialMonth),
    [selected, setSelected] = useState("");
  const [y, m] = month.split("-").map(Number);
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate(),
    first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const visible = days.filter((day) =>
    selected ? day.date === selected : day.date.startsWith(month),
  );
  const move = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(
      d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0"),
    );
    setSelected("");
  };
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
          {weekdays.map((day) => (
            <span className="weekday" key={day}>
              {day}
            </span>
          ))}
          {Array.from({ length: first }, (_, i) => (
            <span key={"blank" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = month + "-" + String(i + 1).padStart(2, "0");
            const events = days.filter((day) => day.date === date);
            return (
              <button
                key={date}
                className={
                  "calendar-day " +
                  (selected === date ? "selected " : "") +
                  (events.length ? "has-events" : "")
                }
                aria-label={date}
                aria-pressed={selected === date}
                onClick={() => setSelected(selected === date ? "" : date)}
              >
                {i + 1}
                {events.length > 0 && <span className="calendar-dot" />}
              </button>
            );
          })}
        </div>
      </div>
      <section className="event-list">
        {visible.length ? (
          visible.map((day) => (
            <article className="community-card" key={day.id}>
              <span className="eyebrow">
                {day.date} {day.is_seed && " · " + t.sample}
              </span>
              <h2>{day.title_kn}</h2>
              <CalendarReminder id={day.id} demo={day.is_seed} />
              <p>{day.description_kn}</p>
              <Link
                className="chip"
                href={
                  "/search?mode=event_date&from=" + day.date + "&to=" + day.date
                }
              >
                {t.relatedNews}
              </Link>
            </article>
          ))
        ) : (
          <p>{t.noCalendar}</p>
        )}
      </section>
    </div>
  );
}
