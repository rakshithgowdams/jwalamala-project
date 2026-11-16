"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Menu, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { sectionGroups } from "@/lib/admin/sections";
import { ChatUnreadBadge } from "@/components/admin/ChatUnreadBadge";
import { getChatUnreadTotal, subscribeChatUnread } from "@/lib/chat/unread";
import { deskHref } from "@/lib/auth/paths";
import { useDeskPathname } from "@/components/admin/DeskPathProvider";

/**
 * Administrators see every feature. Staff only see what they can open —
 * locked features live on the Request access page so the sidebar stays light.
 */
export function AdminNav({
  allowed,
  basePath = "/admin",
}: {
  allowed: string[] | null;
  basePath?: string;
}) {
  const pathname = useDeskPathname();
  const router = useRouter();
  const { tr } = useUiStrings();
  const [open, setOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  const isStaffDesk = allowed !== null;

  const groups = useMemo(
    () =>
      sectionGroups
        .map((group) => ({
          title: group.title,
          links: group.sections
            .filter((s) => !allowed || allowed.includes(s.key))
            .map((s) => [s.key, s.label] as const),
        }))
        .filter((group) => group.links.length),
    [allowed],
  );

  const prefetchHrefs = useMemo(() => {
    const hrefs = groups.flatMap((group) =>
      group.links.map(([path]) => deskHref(basePath, path)),
    );
    if (isStaffDesk) hrefs.push(`${basePath}/no-access`);
    return hrefs;
  }, [groups, basePath, isStaffDesk]);

  useEffect(() => {
    setChatUnread(getChatUnreadTotal());
    return subscribeChatUnread((map) => setChatUnread(getChatUnreadTotal(map)));
  }, []);

  // Warm RSC payloads for every sidebar target so clicks feel instant.
  useEffect(() => {
    for (const href of prefetchHrefs) router.prefetch(href);
  }, [prefetchHrefs, router]);

  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return;
    const top = link.offsetTop;
    if (top < nav.scrollTop || top + link.offsetHeight > nav.scrollTop + nav.clientHeight)
      nav.scrollTop = top - nav.clientHeight / 2 + link.offsetHeight / 2;
  }, [pathname]);

  const isCurrent = (path: string) =>
    path
      ? pathname === `${basePath}/${path}` || pathname.startsWith(`${basePath}/${path}/`)
      : pathname === basePath;

  const requestHref = `${basePath}/no-access`;
  const onRequestPage = pathname.startsWith(`${basePath}/no-access`);

  return (
    <nav
      ref={navRef}
      className={"admin-nav" + (open ? " is-open" : "")}
      aria-label={tr({ en: "Admin sections", kn: "ನಿರ್ವಹಣಾ ವಿಭಾಗಗಳು", hi: "एडमिन अनुभाग" })}
    >
      <button
        type="button"
        className="admin-nav-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className="admin-nav-toggle-action">
          {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>{tr({ en: "Menu", kn: "ಮೆನು", hi: "मेनू" })}</span>
        </span>
      </button>
      <div className="admin-nav-groups">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.title.en}>
            <p>{tr(group.title)}</p>
            {group.links.map(([path, title]) => {
              const href = deskHref(basePath, path);
              return (
                <Link
                  href={href}
                  key={path || "home"}
                  prefetch
                  aria-current={isCurrent(path) ? "page" : undefined}
                  className={path === "chat" && chatUnread ? "has-chat-unread" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="admin-nav-link-label">{tr(title)}</span>
                  {path === "chat" ? (
                    <ChatUnreadBadge count={chatUnread} className="admin-nav-chat-badge" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
        {isStaffDesk ? (
          <div className="admin-nav-group">
            <p>{tr({ en: "Access", kn: "ಪ್ರವೇಶ", hi: "पहुँच" })}</p>
            <Link
              href={requestHref}
              prefetch
              aria-current={onRequestPage ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              <span className="admin-nav-link-label">
                {tr({ en: "Request access", kn: "ಪ್ರವೇಶ ವಿನಂತಿಸಿ", hi: "पहुँच अनुरोध" })}
              </span>
              <KeyRound size={14} aria-hidden="true" className="admin-nav-lock" />
            </Link>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
