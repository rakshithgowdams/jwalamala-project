"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

export function MoreMenu({
  primaryLinks = [],
}: {
  primaryLinks?: [string, string][];
}) {
  const { v4: t, kn } = useUiStrings();

  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const opener = trigger.current;
    if (!open || !element) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      element.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, [open]);
  return (
    <div className="more-menu">
      <button
        ref={trigger}
        type="button"
        className="icon-button hamburger-trigger"
        aria-label={t.openMenu}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="all-sections"
        onClick={() => setOpen(!open)}
      >
        <Menu size={22} aria-hidden="true" />
      </button>
      {open && (
        <dialog
          ref={dialog}
          id="all-sections"
          className="navigation-dialog"
          aria-label={t.openMenu}
          onCancel={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLElement>(
                "a[href], button:not([disabled])",
              ),
            );
            const first = items[0],
              last = items.at(-1);
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first?.focus();
            }
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            )
              setOpen(false);
          }}
        >
          <div className="menu-heading">
            <strong>{kn.menu}</strong>
            <button
              type="button"
              className="icon-button"
              aria-label={kn.close}
              onClick={() => setOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <nav className="mega-menu" aria-label={t.openMenu}>
            {[
              ...primaryLinks,
              ["/districts", t.districtNews],
              ["/local-shops", t.localShops],
              ["/topics", t.topics],
              ["/series", t.series],
              ["/shorts", t.shorts],
              ["/gallery", t.gallery],
              ["/live", t.liveblogs],
              ["/weather", t.weather],
              ["/jain-calendar", t.jainCalendar],
              ["/basadis", t.basadis],
              ["/notices", t.notices],
              ["/opportunities", t.opportunities],
              ["/polls", t.polls],
              ["/quizzes", t.quizzes],
              ["/stories", t.stories],
              ["/reservoirs", t.reservoirs],
              ["/rates", t.rates],
              ["/account/history", t.history],
              ["/editorial", t.editorial],
              ["/corrections", t.corrections],
            ].map(([href, label]) => (
              <Link
                key={href}
                href={href}
                prefetch={false}
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </nav>
        </dialog>
      )}
    </div>
  );
}
