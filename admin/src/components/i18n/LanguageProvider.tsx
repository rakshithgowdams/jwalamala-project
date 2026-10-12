"use client";
import { createContext, useContext } from "react";
import {
  uiStrings,
  DEFAULT_LOCALE,
  LANGUAGE_COOKIE,
  type Locale,
} from "@/lib/i18n/strings";
const Context = createContext<Locale>(DEFAULT_LOCALE);
export function LanguageProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}
export function useUiStrings() {
  return uiStrings(useContext(Context));
}
export function LanguageSwitch({ className = "language-switch" }: { className?: string }) {
  const { locale, kn } = useUiStrings();
  return (
    <select
      className={className}
      aria-label={kn.siteLanguage}
      value={locale}
      onChange={(e) => {
        document.cookie =
          LANGUAGE_COOKIE +
          "=" +
          e.target.value +
          "; Path=/; Max-Age=31536000; SameSite=Lax";
        window.location.reload();
      }}
    >
      <option value="en">English</option>
      <option value="kn">ಕನ್ನಡ</option>
      <option value="hi">हिंदी</option>
    </select>
  );
}
