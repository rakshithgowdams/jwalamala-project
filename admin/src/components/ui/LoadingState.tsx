"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function LoadingState({
  kind = "cards",
  count = 3,
}: {
  kind?: "cards" | "article" | "panel" | "editor";
  count?: number;
}) {
  const { kn } = useUiStrings();
  return (
    <div
      className={`loading-state loading-${kind}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">{kn.loadingContent}</span>
      <div className="loading-content" aria-hidden="true">
        {Array.from({ length: kind === "cards" ? count : 1 }, (_, i) => (
          <div className="skeleton-card" key={i}>
            <div className="skeleton-block skeleton-media" />
            <div className="skeleton-block skeleton-line short" />
            <div className="skeleton-block skeleton-line" />
            <div className="skeleton-block skeleton-line" />
            {kind === "article" || kind === "editor"
              ? Array.from({ length: 5 }, (_, j) => (
                  <div className="skeleton-block skeleton-line" key={j} />
                ))
              : null}
          </div>
        ))}
      </div>
    </div>
  );
}
