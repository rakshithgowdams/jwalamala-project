"use client";
import { uiStrings, isLocale, type Locale } from "@/lib/i18n/strings";

/**
 * This boundary replaces the root layout, so it renders outside the language
 * provider and has to read the reader's choice from the cookie itself.
 */
function cookieLocale(): Locale {
  if (typeof document === "undefined") return "kn";
  const value = document.cookie.match(/jwalamala-language=([^;]+)/)?.[1];
  return isLocale(value) ? value : "kn";
}

export default function GlobalError({ reset }: { reset: () => void }) {
  const locale = cookieLocale();
  const { kn } = uiStrings(locale);
  return (
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "#fafaf9",
          color: "#1c1917",
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            {kn.error}
          </h1>
          <p style={{ color: "#78716c", marginBottom: "1.5rem" }}>
            {kn.errorText}
          </p>
          <button
            onClick={reset}
            style={{
              padding: "0.625rem 1.5rem",
              background: "#c2410c",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "0.9375rem",
            }}
          >
            {kn.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
