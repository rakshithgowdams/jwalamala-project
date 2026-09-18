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
} from "lucide-react";
import { useEffect, useState } from "react";
import {
  themeOrder,
  writeThemeCookie,
  THEME_KEY,
  SCHEME_KEY,
  type ThemePreference,
} from "@/lib/theme/shared";

import type { Category } from "@/lib/types";
export function CategoryNav({ categories }: { categories: Category[] }) {
  const { kn, locale } = useUiStrings();

  const path = usePathname();
  return (
    <div className="nav-wrap">
      <nav className="container category-nav" aria-label={kn.categories}>
        <MoreMenu
          primaryLinks={[
            ["/", kn.home],
            ["/news", kn.news],
            ["/videos", kn.videos],
            ...categories.map((c): [string, string] => [
              `/category/${c.slug}`,
              pickText(locale, c.name_kn, c.name_en),
            ]),
            ["/events", kn.events],
          ]}
        />
        {[
          { href: "/", label: kn.home },
          { href: "/videos", label: kn.videos },
          ...categories.slice(0, 7).map((c) => ({
            href: `/category/${c.slug}`,
            label: pickText(locale, c.name_kn, c.name_en),
          })),
          { href: "/events", label: kn.events },
        ].map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={path === n.href ? "active" : ""}
            aria-current={path === n.href ? "page" : undefined}
          >
            {n.label}
          </Link>
        ))}
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
