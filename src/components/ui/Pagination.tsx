import Link from "next/link";
import { getUiStrings } from "@/lib/i18n/server";
export async function Pagination({
  page,
  pages,
  query = {},
}: {
  page: number;
  pages: number;
  query?: Record<string, string | undefined>;
}) {
  if (pages <= 1) return null;
  const { kn } = await getUiStrings();
  const numbers = [
    ...new Set([
      1,
      ...Array.from({ length: 7 }, (_, i) => page + i - 3).filter(
        (n) => n > 1 && n < pages,
      ),
      pages,
    ]),
  ].sort((a, b) => a - b);
  return (
    <nav className="pagination" aria-label={kn.pages}>
      {numbers.map((n, i) => (
        <span key={n}>
          {i > 0 && n > numbers[i - 1] + 1 && (
            <span aria-hidden="true"> … </span>
          )}
          <Link
            className={"chip " + (n === page ? "active" : "")}
            aria-current={n === page ? "page" : undefined}
            href={
              "?" +
              new URLSearchParams({
                ...Object.fromEntries(
                  Object.entries(query).filter(
                    (entry): entry is [string, string] =>
                      entry[1] !== undefined,
                  ),
                ),
                page: String(n),
              })
            }
          >
            {n}
          </Link>
        </span>
      ))}
    </nav>
  );
}
