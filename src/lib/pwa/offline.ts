/** Reader downloads: whole story pages kept on the device until the reader removes them. */
export const OFFLINE_CACHE = "jwalamala-offline";
export const DOWNLOADS_CHANGED = "jwalamala:downloads-changed";
const INDEX_KEY = "jwalamala-downloads";

export type Download = {
  url: string;
  title: string;
  summary?: string;
  image?: string;
  savedAt: number;
  assets: string[];
};

export function offlineSupported() {
  return typeof window !== "undefined" && "caches" in window;
}

export function listDownloads(): Download[] {
  try {
    const rows = JSON.parse(localStorage.getItem(INDEX_KEY) || "[]");
    return Array.isArray(rows) ? (rows as Download[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(rows: Download[]) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(rows));
  window.dispatchEvent(new Event(DOWNLOADS_CHANGED));
}

export function pageKey(href: string) {
  const url = new URL(href, location.origin);
  return url.origin + url.pathname;
}

/** Everything the current page needed to render: styles, scripts, fonts, and story images. */
function pageAssets(root: Element | null, extra: (string | undefined)[]) {
  const urls = new Set<string>();
  const add = (value: string | null | undefined) => {
    if (!value || /^(data|blob):|hot-update/.test(value)) return;
    try {
      urls.add(new URL(value, location.href).href);
    } catch {}
  };
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="preload"][as="font"]')
    .forEach((link) => add(link.href));
  document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((script) => add(script.src));
  for (const entry of performance.getEntriesByType("resource"))
    if (/\/(_next\/static|fonts)\//.test(entry.name) && entry.name.startsWith(location.origin))
      add(entry.name);
  (root || document)
    .querySelectorAll<HTMLImageElement>("img")
    .forEach((img) => add(img.currentSrc || img.src));
  extra.forEach(add);
  return [...urls];
}

/** Script and style files a page's HTML refers to, including chunks it only loads later. */
function htmlAssets(html: string) {
  const found = new Set<string>();
  for (const match of html.matchAll(/static\/(?:chunks|css|media)\/[^"'\\\s)<>]+/g))
    found.add(location.origin + "/_next/" + match[0]);
  return [...found];
}

async function cachePage(cache: Cache, url: string) {
  const response = await fetch(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error("page " + response.status);
  const html = await response.clone().text();
  await cache.put(url, response);
  return htmlAssets(html);
}

async function fetchForCache(url: string) {
  const sameOrigin = new URL(url).origin === location.origin;
  if (sameOrigin) return fetch(url, { credentials: "same-origin" });
  try {
    return await fetch(url, { mode: "cors", credentials: "omit" });
  } catch {
    return fetch(url, { mode: "no-cors", credentials: "omit" });
  }
}

export async function saveDownload(
  item: Omit<Download, "savedAt" | "assets" | "url"> & { url: string },
  root: Element | null,
) {
  if (!offlineSupported()) throw new Error("unsupported");
  // Asks iOS and other browsers not to clear these files when space runs low.
  void navigator.storage?.persist?.().catch(() => false);
  const cache = await caches.open(OFFLINE_CACHE);
  const url = pageKey(item.url);
  const fromHtml = await cachePage(cache, url);
  const assets = [...new Set([...pageAssets(root, [item.image]), ...fromHtml])];
  // The Downloads screen itself must open without a connection, scripts included.
  const shell = await Promise.allSettled(
    ["/downloads", "/offline"].map((path) => cachePage(cache, location.origin + path)),
  );
  const shellAssets = shell.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
  await Promise.allSettled(
    [...new Set([...assets, ...shellAssets])].map(async (asset) => {
      if (await cache.match(asset)) return;
      const response = await fetchForCache(asset);
      if (response.ok || response.type === "opaque") await cache.put(asset, response);
    }),
  );
  const rows = listDownloads().filter((row) => row.url !== url);
  writeIndex([{ ...item, url, savedAt: Date.now(), assets }, ...rows]);
}

export async function removeDownload(href: string) {
  const url = pageKey(href);
  const rows = listDownloads();
  const target = rows.find((row) => row.url === url);
  const rest = rows.filter((row) => row.url !== url);
  if (offlineSupported()) {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.delete(url);
    const stillUsed = new Set(rest.flatMap((row) => row.assets));
    await Promise.allSettled(
      (target?.assets || [])
        .filter((asset) => !stillUsed.has(asset))
        .map((asset) => cache.delete(asset)),
    );
    if (!rest.length) await caches.delete(OFFLINE_CACHE);
  }
  writeIndex(rest);
}

export async function storageUsed() {
  try {
    const estimate = await navigator.storage?.estimate?.();
    return estimate?.usage ?? null;
  } catch {
    return null;
  }
}
