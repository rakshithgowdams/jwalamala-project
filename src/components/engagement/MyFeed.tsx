"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useLocalValue, FOLLOW_KEY, followSchema } from "@/lib/v4/local-store";
import { NewsCard } from "@/components/news/NewsCard";
import type { Post } from "@/lib/types";

const empty: never[] = [];
export function MyFeed({
  posts,
  targets,
}: {
  posts: Post[];
  targets: Record<string, string[]>;
}) {
  const { v4: t } = useUiStrings();

  const [follows] = useLocalValue(FOLLOW_KEY, followSchema, empty);
  const ids = new Set(
      follows.flatMap((f) => targets[f.target_type + ":" + f.target_id] || []),
    ),
    rows = posts.filter((p) => ids.has(p.id));
  return (
    <>
      {!rows.length ? (
        <p className="notice">{t.noFollow}</p>
      ) : (
        <div className="news-grid">
          {rows.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </>
  );
}
