"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";

import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { Gallery } from "@/lib/v4/types";

type Photo = Gallery["images"][number];
export function GalleryViewer({ images }: { images: Photo[] }) {
  const { kn, v4: t, locale } = useUiStrings();

  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const active = index !== null ? images[index] : null;
  const activeCaption = active
    ? pickText(locale, active.caption, active.caption_en, active.caption_hi)
    : "";
  useEffect(() => {
    if (index === null) {
      trigger.current?.focus();
      return;
    }
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIndex(null);
      if (event.key === "ArrowRight") setIndex((index + 1) % images.length);
      if (event.key === "ArrowLeft")
        setIndex((index + images.length - 1) % images.length);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, images.length]);
  return (
    <>
      <div className="collection-grid">
        {images.map((photo, i) => {
          const caption = pickText(
            locale,
            photo.caption,
            photo.caption_en,
            photo.caption_hi,
          );
          return (
            <figure key={i}>
              <button
                className="collection-image gallery-button"
                aria-label={caption}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setIndex(i);
                }}
              >
                <Image
                  src={photo.url}
                  alt={caption}
                  fill
                  sizes="(max-width:640px) 100vw, 380px"
                />
              </button>
              <figcaption>
                {caption}
                <small className="meta">
                  {t.credit}: {photo.credit}
                </small>
              </figcaption>
            </figure>
          );
        })}
      </div>
      {active && (
        <dialog
          ref={dialog}
          onCancel={() => setIndex(null)}
          className="image-lightbox"
          aria-modal="true"
          aria-label={t.gallery}
          onClick={() => setIndex(null)}
        >
          <div onClick={(event) => event.stopPropagation()}>
            <div className="lightbox-controls">
              <button
                className="icon-button"
                aria-label={kn.previous}
                onClick={() =>
                  setIndex(((index || 0) + images.length - 1) % images.length)
                }
              >
                <ChevronLeft />
              </button>
              <span>
                {(index || 0) + 1} / {images.length}
              </span>
              <button
                className="icon-button"
                aria-label={kn.next}
                onClick={() => setIndex(((index || 0) + 1) % images.length)}
              >
                <ChevronRight />
              </button>
              <button
                className="icon-button"
                aria-label={t.closeMenu}
                onClick={() => setIndex(null)}
                autoFocus
              >
                <X />
              </button>
            </div>
            <div className="lightbox-stage">
              <Image src={active.url} alt={activeCaption} fill sizes="100vw" />
            </div>
            <p>{activeCaption}</p>
            <p>
              {t.credit}: {active.credit}
            </p>
          </div>
        </dialog>
      )}
    </>
  );
}
