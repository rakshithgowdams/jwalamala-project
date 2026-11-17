"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, KeyRound, Menu, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { sectionGroups } from "@/lib/admin/sections";
import { ChatUnreadBadge } from "@/components/admin/ChatUnreadBadge";
import { getChatUnreadTotal, subscribeChatUnread } from "@/lib/chat/unread";
import { deskHref } from "@/lib/auth/paths";
import { useDeskPathname } from "@/components/admin/DeskPathProvider";
import type { Tri } from "@/lib/i18n/strings";

const STORAGE_KEY = "jwalamala-admin-nav-groups";
const ACCESS_GROUP_ID = "Access";

type NavGroup = {
  id: string;
  title: Tri;
  links: readonly (readonly [string, Tri])[];
};

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const isStaffDesk = allowed !== null;

  const groups = useMemo<NavGroup[]>(
    () =>
      sectionGroups
        .map((group) => ({
          id: group.title.en,
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

  const isCurrent = (path: string) =>
    path
      ? pathname === `${basePath}/${path}` || pathname.startsWith(`${basePath}/${path}/`)
      : pathname === basePath;

  const requestHref = `${basePath}/no-access`;
  const onRequestPage = pathname.startsWith(`${basePath}/no-access`);

  const activeGroupId = useMemo(() => {
    for (const group of groups) {
      if (group.links.some(([path]) => isCurrent(path))) return group.id;
    }
    if (isStaffDesk && onRequestPage) return ACCESS_GROUP_ID;
    return groups[0]?.id || "";
  }, [groups, pathname, basePath, isStaffDesk, onRequestPage]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        if (parsed && typeof parsed === "object") setOpenGroups(parsed);
      }
    } catch {
      /* ignore bad storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeGroupId) return;
    setOpenGroups((prev) => {
      if (prev[activeGroupId]) return prev;
      const next = { ...prev, [activeGroupId]: true };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }, [activeGroupId, hydrated]);

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
  }, [pathname, openGroups]);

  function isGroupOpen(id: string) {
    if (openGroups[id] !== undefined) return openGroups[id];
    return id === activeGroupId || id === "Overview";
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !isGroupOpen(id) };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  function renderLinks(links: NavGroup["links"]) {
    return links.map(([path, title]) => {
      const href = deskHref(basePath, path);
      return (
        <Link
          href={href}
          key={path || "home"}
          prefetch
          aria-current={isCurrent(path) ? "page" : undefined}
          className={path === "chat" && chatUnread ? "has-chat-unread" : undefined}
          onClick={() => setMenuOpen(false)}
        >
          <span className="admin-nav-link-label">{tr(title)}</span>
          {path === "chat" ? (
            <ChatUnreadBadge count={chatUnread} className="admin-nav-chat-badge" />
          ) : null}
        </Link>
      );
    });
  }

  return (
    <nav
      ref={navRef}
      className={"admin-nav" + (menuOpen ? " is-open" : "")}
      aria-label={tr({ en: "Admin sections", kn: "ನಿರ್ವಹಣಾ ವಿಭಾಗಗಳು", hi: "एडमिन अनुभाग" })}
    >
      <button
        type="button"
        className="admin-nav-toggle"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span className="admin-nav-toggle-action">
          {menuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          <span>{tr({ en: "Menu", kn: "ಮೆನು", hi: "मेनू" })}</span>
        </span>
      </button>
      <div className="admin-nav-groups">
        {groups.map((group) => {
          const expanded = isGroupOpen(group.id);
          const panelId = `admin-nav-panel-${group.id.replace(/\s+/g, "-").toLowerCase()}`;
          return (
            <div
              className={"admin-nav-group" + (expanded ? " is-open" : "")}
              key={group.id}
            >
              <button
                type="button"
                className="admin-nav-group-toggle"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.id)}
              >
                <span>{tr(group.title)}</span>
                <ChevronDown size={14} aria-hidden="true" className="admin-nav-group-chevron" />
              </button>
              <div
                id={panelId}
                className="admin-nav-group-panel"
                hidden={!expanded}
              >
                {renderLinks(group.links)}
              </div>
            </div>
          );
        })}
        {isStaffDesk ? (
          <div
            className={
              "admin-nav-group" + (isGroupOpen(ACCESS_GROUP_ID) ? " is-open" : "")
            }
          >
            <button
              type="button"
              className="admin-nav-group-toggle"
              aria-expanded={isGroupOpen(ACCESS_GROUP_ID)}
              aria-controls="admin-nav-panel-access"
              onClick={() => toggleGroup(ACCESS_GROUP_ID)}
            >
              <span>{tr({ en: "Access", kn: "ಪ್ರವೇಶ", hi: "पहुँच" })}</span>
              <ChevronDown size={14} aria-hidden="true" className="admin-nav-group-chevron" />
            </button>
            <div
              id="admin-nav-panel-access"
              className="admin-nav-group-panel"
              hidden={!isGroupOpen(ACCESS_GROUP_ID)}
            >
              <Link
                href={requestHref}
                prefetch
                aria-current={onRequestPage ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                <span className="admin-nav-link-label">
                  {tr({ en: "Request access", kn: "ಪ್ರವೇಶ ವಿನಂತಿಸಿ", hi: "पहुँच अनुरोध" })}
                </span>
                <KeyRound size={14} aria-hidden="true" className="admin-nav-lock" />
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
