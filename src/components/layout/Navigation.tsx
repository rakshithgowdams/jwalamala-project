"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";

import Link from "next/link";
import { MoreMenu } from "./MoreMenu";
import { usePathname } from "next/navigation";
import {
  Home,
  PlaySquare,
  Search,
  CalendarDays,
  UserRound,
  Monitor,
  Sun,
  Moon,
  ChevronDown,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  mainNavigation,
  mainNavigationHrefs,
  navLabel,
} from "@/config/navigation";
import {
  themeOrder,
  writeThemeCookie,
  THEME_KEY,
  SCHEME_KEY,
  type ThemePreference,
} from "@/lib/theme/shared";

import type { Category } from "@/lib/types";
export type NavItemLink = { href: string; label: string };
export type MenuSection = NavItemLink & {
  key: string;
  children: NavItemLink[];
};

export function CategoryNav({
  categories,
  districts,
}: {
  categories: Category[];
  districts: NavItemLink[];
}) {
  const { kn, locale } = useUiStrings();
  const path = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const nav = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (
        event instanceof KeyboardEvent
          ? event.key === "Escape"
          : !nav.current?.contains(event.target as Node)
      )
        setOpen(null);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);
  const sections: MenuSection[] = mainNavigation.map((section) => ({
    key: section.key,
    href: section.href,
    label: navLabel(locale, section),
    children:
      section.children === "districts"
        ? districts
        : (section.children || []).map((child) => ({
            href: child.href,
            label: navLabel(locale, child),
          })),
  }));
  const current = (href: string) =>
    href === "/" ? path === "/" : path === href || path.startsWith(href + "/");
  // "Latest news" already covers the general news category.
  const remaining = categories
    .filter(
      (c) =>
        c.slug !== "news" && !mainNavigationHrefs.has(`/category/${c.slug}`),
    )
    .map((c): [string, string] => [
      `/category/${c.slug}`,
      pickText(locale, c.name_kn, c.name_en, c.name_hi),
    ]);
  return (
    <div className="nav-wrap">
      <nav
        ref={nav}
        className="container category-nav main-nav"
        aria-label={kn.categories}
      >
        <MoreMenu
          primaryLinks={[["/videos", kn.videos], ...remaining]}
          sections={sections}
        />
        <ul className="main-nav-list">
          {sections.map((section) => {
            const expanded = open === section.key;
            const active =
              current(section.href) ||
              section.children.some((child) => current(child.href));
            return (
              <li
                key={section.key}
                className={
                  "main-nav-item" +
                  (section.children.length ? " has-menu" : "") +
                  (expanded ? " open" : "")
                }
              >
                <Link
                  href={section.href}
                  className={active ? "active" : ""}
                  aria-current={path === section.href ? "page" : undefined}
                  onClick={() => setOpen(null)}
                >
                  {section.label}
                </Link>
                {section.children.length > 0 && (
                  <>
                    <button
                      type="button"
                      className="main-nav-toggle"
                      aria-expanded={expanded}
                      aria-controls={"menu-" + section.key}
                      aria-label={section.label}
                      onClick={() => setOpen(expanded ? null : section.key)}
                    >
                      <ChevronDown size={14} aria-hidden="true" />
                    </button>
                    <ul
                      id={"menu-" + section.key}
                      className={
                        "main-nav-dropdown" +
                        (section.children.length > 12 ? " columns" : "")
                      }
                    >
                      {section.children.map((child) => (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={
                              path === child.href ? "page" : undefined
                            }
                            onClick={() => setOpen(null)}
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>
        <Link className="nav-search" href="/search" aria-label={kn.search}>
          <Search size={20} />
        </Link>
      </nav>
    </div>
  );
}
export function BottomNav() {
  const { kn } = useUiStrings();

  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label={kn.menu}>
      {[
        { href: "/", label: kn.home, Icon: Home },
        { href: "/videos", label: kn.videos, Icon: PlaySquare },
        { href: "/search", label: kn.search, Icon: Search },
        { href: "/events", label: kn.events, Icon: CalendarDays },
        { href: "/account", label: kn.account, Icon: UserRound },
      ].map(({ href, label, Icon }) => (
        <Link
          href={href}
          key={href}
          aria-current={path === href ? "page" : undefined}
        >
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
export function ThemeToggle({ preference }: { preference: ThemePreference }) {
  const { kn, v4: t } = useUiStrings();

  // Seeded from the cookie the server already read, so the first paint matches.
  const [theme, setTheme] = useState<ThemePreference>(preference);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const scheme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = scheme;
      writeThemeCookie(SCHEME_KEY, scheme);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  const choose = (next: ThemePreference) => {
    setTheme(next);
    writeThemeCookie(THEME_KEY, next);
  };
  const options = [
    { value: "system", label: t.systemTheme, Icon: Monitor },
    { value: "light", label: kn.light, Icon: Sun },
    { value: "dark", label: kn.dark, Icon: Moon },
  ] as const;
  return (
    <fieldset
      className="theme-toggle"
      data-motion="off"
      data-active={themeOrder.indexOf(theme)}
    >
      <legend className="sr-only">{t.theme}</legend>
      <span className="theme-toggle-thumb" aria-hidden="true" />
      {options.map(({ value, label, Icon }) => (
        <label key={value} className="theme-toggle-option" title={label}>
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => choose(value)}
          />
          <Icon size={15} aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </label>
      ))}
    </fieldset>
  );
}
