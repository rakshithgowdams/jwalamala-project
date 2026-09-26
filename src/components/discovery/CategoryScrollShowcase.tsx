"use client";
import { useRef, type ReactNode, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";
import { NewsCard } from "@/components/news/NewsCard";
import type { Post, Category } from "@/lib/types";

type RowStyle = CSSProperties & { [key: `--${string}`]: string };

const PALETTE = [
  "var(--vivid-1)",
  "var(--vivid-2)",
  "var(--vivid-3)",
  "var(--vivid-4)",
  "var(--vivid-5)",
  "var(--vivid-6)",
];

function reduceMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function ScrollRow({
  color,
  title,
  href,
  children,
}: {
  color: string;
  title: string;
  href: string;
  children: ReactNode;
}) {
  const { kn } = useUiStrings();
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollBy = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reduceMotion() ? "auto" : "smooth",
    });
  };
  return (
    <div className="discover-row" style={{ "--row-accent": color } as RowStyle}>
      <div className="discover-row-head">
        <Link href={href} className="discover-row-title">
          <span className="discover-dot" aria-hidden="true" />
          {title}
        </Link>
        <div className="discover-row-controls">
          <button
            type="button"
            aria-label={kn.previous}
            onClick={() => scrollBy(-1)}
          >
            <ArrowLeft size={16} />
          </button>
          <button
            type="button"
            aria-label={kn.next}
            onClick={() => scrollBy(1)}
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      <div className="discover-track" ref={trackRef}>
        {children}
      </div>
    </div>
  );
}

export function CategoryScrollShowcase({
  posts,
  categories,
}: {
  posts: Post[];
  categories: Category[];
}) {
  const { kn, locale } = useUiStrings();
  const rows = categories
    .map((category) => ({
      category,
      items: posts
        .filter((p) => p.category_slugs.includes(category.slug))
        .slice(0, 10),
    }))
    .filter((row) => row.items.length >= 2)
    .slice(0, 8);
  if (!rows.length) return null;
  return (
    <section className="discover-panel">
      <div className="section-title">
        <h2>{kn.categoryNews}</h2>
      </div>
      <div className="discover-scroll-y">
        {rows.map((row, i) => (
          <ScrollRow
            key={row.category.slug}
            color={PALETTE[i % PALETTE.length]}
            title={pickText(
              locale,
              row.category.name_kn,
              row.category.name_en,
              row.category.name_hi,
            )}
            href={`/category/${row.category.slug}`}
          >
            {row.items.map((post) => (
              <div className="discover-card" key={post.id}>
                <NewsCard post={post} />
              </div>
            ))}
          </ScrollRow>
        ))}
      </div>
    </section>
  );
}
