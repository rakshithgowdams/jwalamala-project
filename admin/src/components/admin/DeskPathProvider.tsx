"use client";

import { createContext, useContext, useEffect } from "react";
import { usePathname } from "next/navigation";

const DeskPathContext = createContext("/admin");

export function DeskPathProvider({
  basePath,
  children,
}: {
  basePath: string;
  children: React.ReactNode;
}) {
  return (
    <DeskPathContext.Provider value={basePath}>
      {basePath === "/staff" ? <DeskUrlGuard /> : null}
      {children}
    </DeskPathContext.Provider>
  );
}

export function useDeskPath() {
  return useContext(DeskPathContext);
}

/** Join desk base with a section or relative path (posts/id, tasks, …). */
export function useDeskHref(path = "") {
  const base = useDeskPath();
  const clean = path.replace(/^\/+/, "");
  return clean ? `${base}/${clean}` : base;
}

/**
 * Next rewrites /staff → /admin for the route tree, so usePathname() often
 * reports /admin/…. Map that back onto the desk the user is actually on.
 */
export function useDeskPathname() {
  const basePath = useDeskPath();
  const pathname = usePathname() || "/";
  if (basePath === "/staff" && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    return "/staff" + pathname.slice("/admin".length);
  }
  return pathname;
}

/**
 * Keep the address bar on /staff without a second RSC navigation.
 * router.replace here used to double-load every sidebar click.
 */
function DeskUrlGuard() {
  const pathname = usePathname();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const shown = window.location.pathname;
    if (shown !== "/admin" && !shown.startsWith("/admin/")) return;
    const next =
      "/staff" + (shown === "/admin" ? "" : shown.slice("/admin".length)) + window.location.search;
    window.history.replaceState(window.history.state, "", next);
  }, [pathname]);
  return null;
}
