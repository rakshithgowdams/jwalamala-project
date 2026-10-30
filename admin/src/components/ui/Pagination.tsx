"use client";
import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

export function Pagination({
  page,
  pages,
  query = {},
}: {
  page: number;
  pages: number;
  query?: Record<string, string | undefined>;
}) {
  const { kn } = useUiStrings();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  if (pages <= 1) return null;
  const numbers = [
    ...new Set([
      1,
      ...Array.from({ length: 7 }, (_, i) => page + i - 3).filter(
        (n) => n > 1 && n < pages,
      ),
      pages,
    ]),
  ].sort((a, b) => a - b);

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
        <span key={n}>
          {i > 0 && n > numbers[i - 1] + 1 && (
            <span aria-hidden="true"> … </span>
          )}
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
    </nav>
  );
}
