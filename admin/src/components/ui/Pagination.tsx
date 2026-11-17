"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { useDeskPathname } from "@/components/admin/DeskPathProvider";

/** Build 1 2 3 4 … N (or a sliding window around the current page). */
function pageItems(page: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const picks = new Set<number>([1, pages]);
  if (page <= 4) {
    for (let n = 2; n <= 4; n++) picks.add(n);
  } else if (page >= pages - 3) {
    for (let n = pages - 3; n < pages; n++) picks.add(n);
  } else {
    picks.add(page - 1);
    picks.add(page);
    picks.add(page + 1);
  }
  return [...picks].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
}

export function Pagination({
  page,
  pages,
  query = {},
}: {
  page: number;
  pages: number;
  query?: Record<string, string | undefined>;
}) {
  const { kn, tr } = useUiStrings();
  const router = useRouter();
  const pathname = useDeskPathname();
  const [pending, startTransition] = useTransition();
  if (pages <= 1) return null;
  const numbers = pageItems(page, pages);

  function go(nextPage: number) {
    if (nextPage === page || pending) return;
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(query).filter(
          (entry): entry is [string, string] => Boolean(entry[1]),
        ),
      ),
    );
    if (nextPage > 1) params.set("page", String(nextPage));
    else params.delete("page");
    const href = params.size ? `${pathname}?${params}` : pathname;
    startTransition(() => router.replace(href, { scroll: false }));
  }

  return (
    <nav
      className={"pagination" + (pending ? " is-loading" : "")}
      aria-label={kn.pages}
      aria-busy={pending || undefined}
    >
      {numbers.map((n, i) => (
        <span key={n} className="pagination-item">
          {i > 0 && n > numbers[i - 1] + 1 ? (
            <span className="pagination-ellipsis" aria-hidden="true">
              …
            </span>
          ) : null}
          <button
            type="button"
            className={"chip " + (n === page ? "active" : "")}
            aria-current={n === page ? "page" : undefined}
            disabled={pending}
            onClick={() => go(n)}
          >
            {n}
          </button>
        </span>
      ))}
      <span className="pagination-total">
        {tr({
          en: `Page ${page} of ${pages}`,
          kn: `ಪುಟ ${page} / ${pages}`,
          hi: `पृष्ठ ${page} / ${pages}`,
        })}
      </span>
    </nav>
  );
}
