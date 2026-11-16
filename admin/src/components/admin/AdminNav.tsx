"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Menu, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { sectionGroups } from "@/lib/admin/sections";
import { ChatUnreadBadge } from "@/components/admin/ChatUnreadBadge";
import { getChatUnreadTotal, subscribeChatUnread } from "@/lib/chat/unread";

/** Null shows every feature (administrators); otherwise only the granted ones. */
export function AdminNav({ allowed }: { allowed: string[] | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { tr } = useUiStrings();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [chatUnread, setChatUnread] = useState(0);
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!pending) setPendingHref(null);
  }, [pending, pathname]);
  useEffect(() => {
    setChatUnread(getChatUnreadTotal());
    return subscribeChatUnread((map) => setChatUnread(getChatUnreadTotal(map)));
  }, []);
  // Scroll only the sidebar, never the page, so the current section stays visible.
  useEffect(() => {
    const nav = navRef.current;
    const link = nav?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!nav || !link || nav.scrollHeight <= nav.clientHeight) return;
    const top = link.offsetTop;
    if (top < nav.scrollTop || top + link.offsetHeight > nav.scrollTop + nav.clientHeight)
      nav.scrollTop = top - nav.clientHeight / 2 + link.offsetHeight / 2;
  }, [pathname]);
  const groups = sectionGroups
    .map((group) => ({
      title: group.title,
      links: group.sections
        .filter((s) => !allowed || allowed.includes(s.key))
        .map((s) => [s.key, s.label] as const),
    }))
    .filter((group) => group.links.length);
  const isCurrent = (path: string) =>
    path
      ? pathname === "/admin/" + path || pathname.startsWith("/admin/" + path + "/")
      : pathname === "/admin";
  function go(href: string) {
    setOpen(false);
    if (href === pathname || pending) return;
    setPendingHref(href);
    startTransition(() => {
      router.push(href);
    });
  }
  return (
    <nav
      ref={navRef}
      className={"admin-nav" + (open ? " is-open" : "") + (pending ? " is-loading" : "")}
      aria-label={tr({ en: "Admin sections", kn: "ನಿರ್ವಹಣಾ ವಿಭಾಗಗಳು", hi: "एडमिन अनुभाग" })}
      aria-busy={pending || undefined}
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
              const href = "/admin" + (path ? "/" + path : "");
              return (
                <Link
                  href={href}
                  key={path}
                  prefetch={false}
                  aria-current={isCurrent(path) ? "page" : undefined}
                  className={
                    [
                      pendingHref === href ? "is-pending" : "",
                      path === "chat" && chatUnread ? "has-chat-unread" : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                      setOpen(false);
                      return;
                    }
                    event.preventDefault();
                    go(href);
                  }}
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
      </div>
    </nav>
  );
}
