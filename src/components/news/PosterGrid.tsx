"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Post } from "@/lib/types";
import { postHref } from "@/lib/utils/post-href";
import Link from "next/link";

type Shot = { url: string; credit: string; title: string; href: string };

function shotsOf(post: Post): Shot[] {
  const title = post.title_kn;
  const href = postHref(post);
  const gallery = (post.media_images || []).filter((image) => image.url);
  if (gallery.length)
    return gallery.map((image) => ({
      url: image.url,
      credit: image.credit,
      title,
      href,
    }));
  if (post.thumbnail_url)
    return [
      {
        url: post.thumbnail_url,
        credit: post.image_credit || "",
        title,
        href,
      },
    ];
  return [];
}

export function PosterGrid({ posts }: { posts: Post[] }) {
  const { kn, v4: t, locale } = useUiStrings();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [index, setIndex] = useState<number | null>(null);
  const shots = posts.flatMap(shotsOf);
  const active = index !== null ? shots[index] : null;
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
      if (event.key === "ArrowRight") setIndex((index + 1) % shots.length);
      if (event.key === "ArrowLeft")
        setIndex((index + shots.length - 1) % shots.length);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, shots.length]);
  if (!shots.length) return null;
  return (
    <>
      <div className="poster-grid">
        {posts.map((post) => {
          const preview = shotsOf(post)[0];
          if (!preview) return null;
          const title = pickText(
            locale,
            post.title_kn,
            post.title_en,
            post.title_hi,
          );
          const start = shots.findIndex((shot) => shot.url === preview.url && shot.href === preview.href);
          return (
            <figure key={post.id}>
              <button
                type="button"
                className="collection-image gallery-button"
                aria-label={title}
                onClick={(event) => {
                  trigger.current = event.currentTarget;
                  setIndex(Math.max(0, start));
                }}
              >
                <Image
                  src={preview.url}
                  alt={title}
                  fill
                  sizes="(max-width:640px) 100vw, 380px"
                />
              </button>
              <figcaption>
                <Link href={postHref(post)}>{title}</Link>
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
                  setIndex(((index || 0) + shots.length - 1) % shots.length)
                }
              >
                <ChevronLeft />
              </button>
              <span>
                {(index || 0) + 1} / {shots.length}
              </span>
              <button
                className="icon-button"
                aria-label={kn.next}
                onClick={() =>
                  setIndex(((index || 0) + 1) % shots.length)
                }
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
              <Image src={active.url} alt={active.title} fill sizes="100vw" />
            </div>
            <p>
              <Link href={active.href}>{active.title}</Link>
            </p>
            {active.credit ? (
              <p>
                {t.credit}: {active.credit}
              </p>
            ) : null}
          </div>
        </dialog>
      )}
    </>
  );
}
