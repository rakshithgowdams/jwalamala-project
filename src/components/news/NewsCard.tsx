"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import Link from "next/link";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { MapPin, ArrowUpRight, Play } from "lucide-react";

import type { Post } from "@/lib/types";
import { EventDateBadge } from "@/components/ui/Primitives";
import { BookmarkButton } from "./PostActions";
import { postHref } from "@/lib/utils/post-href";
export function NewsCard({
  post,
  compact = false,
}: {
  post: Post;
  compact?: boolean;
}) {
  const { kn, locale } = useUiStrings();
  const english = locale === "en";
  const title = (english && post.title_en) || post.title_kn;
  const summary = (english && post.summary_en) || post.summary_kn;
  return (
    <article className={`news-card ${compact ? "compact" : ""}`}>
      <Link
        href={postHref(post)}
        className="card-image"
        tabIndex={-1}
        aria-hidden="true"
      >
        <Image
          src={post.thumbnail_url || "/images/jwalamala-logo.jpg"}
          alt=""
          fill
          sizes={
            compact
              ? "120px"
              : "(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 380px"
          }
        />
        {post.type !== "article" && (
          <span className="play-circle">
            <Play size={19} fill="currentColor" />
          </span>
        )}
        <EventDateBadge date={post.event_date} />
      </Link>
      <div className="card-body">
        <div className="eyebrow">
          {post.type === "article" ? kn.news : kn.videoLabel}
        </div>
        <h3>
          <Link href={postHref(post)}>{title}</Link>
        </h3>
        {!compact && <p>{summary}</p>}
        {!compact && !!post.tags?.length && (
          <div className="card-tags">
            {post.tags.slice(0, 2).map((tag) => (
              <Link href={"/tag/" + tag.slug} key={tag.slug}>
                #{tag.name_kn}
              </Link>
            ))}
          </div>
        )}
        <div className="card-meta">
          <span>
            <MapPin size={13} />
            {post.event_place}
          </span>
          {compact ? (
            <ArrowUpRight size={16} />
          ) : (
            <BookmarkButton postId={post.id} href={postHref(post)} iconOnly />
          )}
        </div>
      </div>
    </article>
  );
}
export function HeroStory({ post }: { post: Post }) {
  const { kn, locale } = useUiStrings();
  const english = locale === "en";
  return (
    <article className="hero-story">
      <Link
        href={postHref(post)}
        className="hero-image"
        aria-hidden="true"
        tabIndex={-1}
      >
        <Image
          src={post.thumbnail_url}
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 780px"
        />
        <span className="hero-kicker">{kn.featured}</span>
        <EventDateBadge date={post.event_date} />
      </Link>
      <div className="hero-story-body">
        <span className="eyebrow">
          {post.event_place} <span>•</span> {kn.news}
        </span>
        <h1>
          <Link href={postHref(post)}>
            {(english && post.title_en) || post.title_kn}
          </Link>
        </h1>
        <p>{(english && post.summary_en) || post.summary_kn}</p>
        <div className="hero-meta">
          <span className="meta">
            {kn.published}: {post.published_at.slice(0, 10)}
          </span>
          <Link href={postHref(post)}>
            {kn.readMore}
            <ArrowUpRight size={18} />
          </Link>
        </div>
      </div>
    </article>
  );
}
