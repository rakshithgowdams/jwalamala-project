"use client";
import { useEffect, useRef, useState } from "react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

/** Readers still need to type, paste and select inside form fields. */
const allowed = (target: EventTarget | null) => {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  return !!element?.closest(
    "input, textarea, select, [contenteditable='true'], [data-allow-copy]",
  );
};

/**
 * Deters casual copying of articles. A browser cannot truly stop screenshots or
 * reading the page source, so this only raises the effort for copy-paste.
 */
export function ContentProtection() {
  const { kn } = useUiStrings();
  const [warning, setWarning] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const root = document.documentElement;
    const warn = () => {
      setWarning(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setWarning(false), 2500);
    };
    const block = (event: Event) => {
      if (allowed(event.target)) return;
      event.preventDefault();
      if (event.type !== "selectstart" && event.type !== "dragstart") warn();
    };
    const keys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifier = event.ctrlKey || event.metaKey;
      const copying =
        modifier && ["c", "x", "a"].includes(key) && !allowed(event.target);
      const saving = modifier && ["s", "p", "u"].includes(key);
      const devtools =
        process.env.NODE_ENV === "production" &&
        (key === "f12" ||
          (modifier && event.shiftKey && ["i", "j", "c"].includes(key)));
      if (copying || saving || devtools) {
        event.preventDefault();
        warn();
      }
    };
    const printScreen = (event: KeyboardEvent) => {
      if (event.key !== "PrintScreen") return;
      navigator.clipboard?.writeText("").catch(() => {});
      warn();
    };
    const shield = () => {
      // Clicking into a video embed moves focus to its frame; keep it visible.
      if (document.activeElement instanceof HTMLIFrameElement) return;
      root.classList.add("content-shielded");
    };
    const unshield = () => root.classList.remove("content-shielded");
    const visibility = () => (document.hidden ? shield() : unshield());

    const events = ["contextmenu", "copy", "cut", "dragstart", "selectstart"];
    for (const name of events) document.addEventListener(name, block);
    document.addEventListener("keydown", keys);
    document.addEventListener("keyup", printScreen);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("blur", shield);
    window.addEventListener("focus", unshield);
    return () => {
      for (const name of events) document.removeEventListener(name, block);
      document.removeEventListener("keydown", keys);
      document.removeEventListener("keyup", printScreen);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("blur", shield);
      window.removeEventListener("focus", unshield);
      window.clearTimeout(timer.current);
      unshield();
    };
  }, []);

  return (
    <div
      className={"protect-toast" + (warning ? " is-visible" : "")}
      role="status"
      aria-live="polite"
    >
      {warning ? kn.protectedContent : ""}
    </div>
  );
}
