import { pages } from "@/content/pages.kn";
import { pagesEn } from "@/content/pages.en";
import { pagesHi } from "@/content/pages.hi";
import type { Locale } from "./strings";
export type StaticPage = { title: string; paragraphs: string[] };
export function staticPages(locale: Locale): Record<string, StaticPage> {
  // Kannada is the source of record: a translation table only overrides the
  // pages it actually carries, so a missing entry falls back rather than 404s.
  const table = { kn: pages, en: pagesEn, hi: pagesHi }[locale];
  return { ...pages, ...table };
}
