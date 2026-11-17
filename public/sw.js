/* Jwalamala News service worker. Plain JavaScript, served as-is from /public. */
const SHELL = "jwalamala-shell-v1";
const PAGES = "jwalamala-pages";
const ASSETS = "jwalamala-assets";
const IMAGES = "jwalamala-images";
// Stories a reader chose to download. Never trimmed here; only the reader removes them.
const OFFLINE = "jwalamala-offline";
const SHELL_URLS = [
  "/offline",
  "/downloads",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/apple-touch-icon.png",
  "/images/jwalamala-logo.jpg",
];
const KEEP = new Set([SHELL, PAGES, ASSETS, IMAGES, OFFLINE]);

const publicPage = (url) =>
  url.origin === self.location.origin &&
  !/^\/(admin|account|login|signup|auth|api|review)(\/|$)/.test(url.pathname) &&
  !url.pathname.startsWith("/newsletter/");

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function fromCaches(request, names) {
  for (const name of names) {
    const cache = await caches.open(name);
    const hit =
      (await cache.match(request)) ||
      (await cache.match(request, { ignoreSearch: true, ignoreVary: true }));
    if (hit) return hit;
  }
  return undefined;
}

// HTML pages name their hashed script files; without them the page cannot start offline.
const STATIC_IN_HTML = /static\/(?:chunks|css|media)\/[^"'\\\s)<>]+/g;

async function cacheShell() {
  const cache = await caches.open(SHELL);
  const assets = new Set();
  await Promise.allSettled(
    SHELL_URLS.map(async (url) => {
      const response = await fetch(new Request(url, { cache: "reload" }));
      if (!response.ok) return;
      if ((response.headers.get("Content-Type") || "").includes("text/html"))
        for (const match of (await response.clone().text()).matchAll(STATIC_IN_HTML))
          assets.add("/_next/" + match[0]);
      await cache.put(url, response);
    }),
  );
  await Promise.allSettled([...assets].map((url) => cache.add(url)));
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShell());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys())
        if (name.startsWith("jwalamala-") && !KEEP.has(name)) await caches.delete(name);
      if (self.registration.navigationPreload)
        await self.registration.navigationPreload.enable().catch(() => {});
      await self.clients.claim();
    })(),
  );
});

async function handlePage(event) {
  const { request } = event;
  const network = (async () => {
    const preload = await event.preloadResponse;
    const response = preload || (await fetch(request));
    if (response.ok && response.type === "basic") {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(PAGES)
          .then((cache) => cache.put(request.url.split("?")[0], copy))
          .then(() => trim(PAGES, 100)),
      );
    }
    return response;
  })();
  // Keeps the worker alive so a slow network response can still refresh the cache.
  event.waitUntil(network.catch(() => {}));
  const timeout = new Promise((resolve) => setTimeout(resolve, 3000, "timeout"));
  try {
    const first = await Promise.race([network, timeout]);
    if (first !== "timeout") return first;
    const cached = await fromCaches(request, [OFFLINE, PAGES]);
    return cached || (await network);
  } catch {
    return (
      (await fromCaches(request, [OFFLINE, PAGES, SHELL])) ||
      (await caches.match("/offline")) ||
      Response.error()
    );
  }
}

async function cacheFirst(event, cacheName, max) {
  const { request } = event;
  const cached = await fromCaches(request, [cacheName, OFFLINE, SHELL]);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(cacheName)
          .then((cache) => cache.put(request, copy))
          .then(() => trim(cacheName, max)),
      );
    }
    return response;
  } catch {
    return Response.error();
  }
}

async function networkThenDownloads(request) {
  try {
    return await fetch(request);
  } catch {
    return (await fromCaches(request, [OFFLINE])) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (request.mode === "navigate") {
    if (publicPage(url)) event.respondWith(handlePage(event));
    return;
  }
  if (url.origin === self.location.origin) {
    // App Router data requests; when these fail offline, Next falls back to a
    // full page load, which the navigation handler above can answer.
    if (url.searchParams.has("_rsc") || request.headers.get("RSC")) return;
    if (
      url.pathname.startsWith("/_next/static/") ||
      url.pathname.startsWith("/fonts/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.startsWith("/images/")
    ) {
      event.respondWith(cacheFirst(event, ASSETS, 300));
      return;
    }
    if (url.pathname === "/_next/image") {
      event.respondWith(cacheFirst(event, IMAGES, 200));
      return;
    }
    return;
  }
  if (request.destination === "image") event.respondWith(networkThenDownloads(request));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
  if (event.data?.type === "CACHE_ARTICLE" && typeof event.data.url === "string") {
    const url = new URL(event.data.url, self.location.origin);
    if (publicPage(url) && /^\/(news|video)\/[^/]+$/.test(url.pathname))
      event.waitUntil(
        fetch(url.href, { credentials: "same-origin" }).then(async (response) => {
          if (response.ok) await (await caches.open(PAGES)).put(url.href, response);
        }),
      );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      ...(data.image ? { image: data.image } : {}),
      actions: [
        { action: "read", title: "ಓದಿ" },
        { action: "later", title: "ನಂತರ" },
      ],
      data: { url: data.url || "/", click_token: data.click_token },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "later") return;
  if (event.notification.data?.click_token)
    event.waitUntil(
      fetch("/api/push/click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: event.notification.data.click_token }),
      }).catch(() => {}),
    );
  const url = new URL(event.notification.data?.url || "/", self.location.origin);
  event.waitUntil(
    self.clients.openWindow(
      url.origin === self.location.origin ? url.href : self.location.origin,
    ),
  );
});
