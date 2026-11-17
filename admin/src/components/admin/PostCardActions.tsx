"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { useDeskPath } from "@/components/admin/DeskPathProvider";
import { trashPost } from "@/app/admin/actions";
import { site } from "@/config/site";

export function PostCardActions({
  postId,
  title,
  slug,
  status,
  canDelete,
}: {
  postId: string;
  title: string;
  slug: string;
  status: string;
  canDelete: boolean;
}) {
  const { tr, kn, l } = useUiStrings();
  const router = useRouter();
  const basePath = useDeskPath();
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  function closeMenu() {
    setOpen(false);
    setMenuPos(null);
  }

  function placeMenu(button: HTMLButtonElement, panel?: HTMLElement | null) {
    const rect = button.getBoundingClientRect();
    const panelWidth = Math.max(panel?.offsetWidth || 0, 200);
    const panelHeight = Math.max(panel?.offsetHeight || 0, 160);
    const gap = 8;
    const left = Math.min(
      Math.max(12, rect.right - panelWidth),
      Math.max(12, window.innerWidth - panelWidth - 12),
    );
    const below = rect.bottom + gap;
    const fitsBelow = below + panelHeight <= window.innerHeight - 12;
    const top = fitsBelow
      ? below
      : Math.max(12, Math.min(rect.top - panelHeight - gap, window.innerHeight - panelHeight - 12));
    setMenuPos({ top, left });
  }

  function openMenu(button: HTMLButtonElement) {
    if (open) {
      closeMenu();
      return;
    }
    placeMenu(button);
    setOpen(true);
    setError("");
  }

  useEffect(() => {
    if (!open) return;
    function onReposition() {
      if (triggerRef.current) placeMenu(triggerRef.current, menuRef.current);
    }
    const frame = window.requestAnimationFrame(onReposition);
    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      closeMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [open]);

  function moveToBin() {
    closeMenu();
    start(async () => {
      setError("");
      try {
        const result = await trashPost(postId);
        if (result.error) {
          setError(l(result.error));
          return;
        }
        router.refresh();
      } catch {
        setError(kn.unavailable);
      }
    });
  }

  return (
    <div className="password-vault-menu">
      <button
        type="button"
        className="password-vault-menu-trigger"
        ref={triggerRef}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={tr({
          en: "More actions",
          kn: "ಹೆಚ್ಚು ಕ್ರಿಯೆಗಳು",
          hi: "और क्रियाएँ",
        })}
        disabled={pending}
        onClick={(event) => openMenu(event.currentTarget)}
      >
        <MoreVertical size={18} aria-hidden="true" />
      </button>
      {error ? (
        <span className="delete-post-error" role="alert">
          {error}
        </span>
      ) : null}
      {open && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="password-vault-menu-panel is-portal"
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <Link
                href={`${basePath}/posts/${postId}`}
                prefetch={false}
                role="menuitem"
                onClick={closeMenu}
              >
                <Pencil size={15} aria-hidden="true" />
                {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
              </Link>
              {status === "published" && slug ? (
                <a
                  href={`${site.url}/news/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                </a>
              ) : (
                <button type="button" role="menuitem" disabled>
                  <ExternalLink size={15} aria-hidden="true" />
                  {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                </button>
              )}
              {canDelete ? (
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  disabled={pending}
                  onClick={moveToBin}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  {tr({ en: "Move to bin", kn: "ಡಬ್ಬಿಗೆ ಸೇರಿಸಿ", hi: "बिन में भेजें" })}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
