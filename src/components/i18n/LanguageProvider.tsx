"use client";
import { createContext, useContext } from "react";
import { uiStrings, type Locale } from "@/lib/i18n/strings";
const Context = createContext<Locale>("kn");
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
export function LanguageSwitch() {
  const { locale } = useUiStrings();
  return (
    <select
      className="language-switch"
      aria-label="Interface language"
      value={locale}
      onChange={async (e) => {
        document.cookie =
          "jwalamala-language=" +
          e.target.value +
          "; Path=/; Max-Age=31536000; SameSite=Lax";
        try {
          if ("caches" in window) await caches.delete("jwalamala-pages");
        } catch {}
        window.location.reload();
      }}
    >
      <option value="kn">ಕನ್ನಡ</option>
      <option value="en">English</option>
      <option value="hi">हिंदी</option>
    </select>
  );
}
