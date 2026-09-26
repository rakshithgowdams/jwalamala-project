"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";

import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import Link from "next/link";
import { useState, useRef } from "react";

import type { WebStory } from "@/lib/v4/types";
export function StoryViewer({ story }: { story: WebStory }) {
  const { kn, v4: t, locale } = useUiStrings();

  const touchStart = useRef(0);
  const [index, setIndex] = useState(0);
  const slide = story.slides[index];
  if (!slide) return null;
  const text = pickText(locale, slide.text, slide.text_en, slide.text_hi);
  return (
    <div>
      <div
        className="stories-stage"
        tabIndex={0}
        role="group"
        aria-label={pickText(
          locale,
          story.title_kn,
          story.title_en,
          story.title_hi,
        )}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight")
            setIndex((i) => Math.min(story.slides.length - 1, i + 1));
          if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
        }}
        onTouchStart={(e) => {
          touchStart.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const delta = e.changedTouches[0].clientX - touchStart.current;
          if (Math.abs(delta) > 50)
            setIndex((i) =>
              Math.min(
                story.slides.length - 1,
                Math.max(0, i + (delta < 0 ? 1 : -1)),
              ),
            );
        }}
      >
        <Image src={slide.image} alt={text} fill sizes="420px" priority />
        <div className="stories-progress">
          {story.slides.map((_, i) => (
            <span className={i <= index ? "active" : ""} key={i} />
          ))}
        </div>
        <div className="stories-caption">
          <h2>{text}</h2>
          <p>
            {t.credit}: {slide.credit}
          </p>
          {slide.href?.startsWith("/") && !slide.href.startsWith("//") && (
            <Link className="chip" href={slide.href}>
              {t.read}
            </Link>
          )}
        </div>
      </div>
      <nav className="pagination">
        <button
          className="chip"
          disabled={index === 0}
          onClick={() => setIndex(index - 1)}
        >
          {kn.previous}
        </button>
        <span>
          {index + 1} / {story.slides.length}
        </span>
        <button
          className="chip"
          disabled={index === story.slides.length - 1}
          onClick={() => setIndex(index + 1)}
        >
          {kn.next}
        </button>
      </nav>
    </div>
  );
}
