"use client";
import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import type { NewsEvent } from "@/lib/types";
import { EventCard } from "./EventCard";

// One card holds the strip at a time: it slides in from the left, pops, then
// slides out to the right so the next event takes over. Without JavaScript or
// with reduced motion the cards stay in the original side-by-side grid.
export function EventsTicker({ events }: { events: NewsEvent[] }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const cards = gsap.utils.toArray<HTMLElement>(
        container.querySelectorAll(".event-card"),
      );
      if (cards.length < 2) return;
      // Stack the cards only once the rotation can actually run.
      container.dataset.ticker = "on";
      const timeline = gsap.timeline({ repeat: -1 });
      cards.forEach((card) => {
        timeline
          .fromTo(
            card,
            { xPercent: -20, scale: 0.92, autoAlpha: 0 },
            {
              xPercent: 0,
              scale: 1,
              autoAlpha: 1,
              duration: 0.5,
              ease: "power3.out",
            },
          )
          .to(card, { scale: 1.05, duration: 0.22, ease: "power2.out" })
          .to(card, { scale: 1, duration: 0.22, ease: "power2.inOut" })
          .to(
            card,
            {
              xPercent: 24,
              autoAlpha: 0,
              duration: 0.45,
              ease: "power2.in",
            },
            "+=1.6",
          );
      });
      // Moving content must be stoppable while someone reads or clicks it.
      const hold = () => timeline.pause();
      const resume = () => timeline.resume();
      container.addEventListener("pointerenter", hold);
      container.addEventListener("pointerleave", resume);
      container.addEventListener("focusin", hold);
      container.addEventListener("focusout", resume);
      return () => {
        container.removeEventListener("pointerenter", hold);
        container.removeEventListener("pointerleave", resume);
        container.removeEventListener("focusin", hold);
        container.removeEventListener("focusout", resume);
        timeline.kill();
        gsap.set(cards, { clearProps: "all" });
        delete container.dataset.ticker;
      };
    });
    return () => media.revert();
  }, [events.length]);
  return (
    <div
      className="events-strip-cards events-ticker"
      ref={root}
      data-motion="off"
    >
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}
