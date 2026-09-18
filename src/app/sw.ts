import {
  Serwist,
  NetworkFirst,
  CacheFirst,
  ExpirationPlugin,
  CacheableResponsePlugin,
  type PrecacheEntry,
  type SerwistGlobalConfig,
} from "serwist";
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;
const publicPage = (url: URL) =>
  url.origin === self.location.origin &&
  !/^\/(admin|account|login|signup|auth|api|review)(\/|$)/.test(url.pathname) &&
  !url.pathname.startsWith("/newsletter/");
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ request, url }) =>
        request.mode === "navigate" && publicPage(url),
      handler: new NetworkFirst({
        cacheName: "jwalamala-pages",
        networkTimeoutSeconds: 3,
        plugins: [
          new CacheableResponsePlugin({ statuses: [200] }),
          new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 86400 * 7 }),
        ],
      }),
    },
    {
      matcher: ({ request, url }) =>
        request.method === "GET" &&
        url.origin === self.location.origin &&
        (url.pathname.startsWith("/_next/static/") ||
          url.pathname.startsWith("/icons/") ||
          url.pathname.startsWith("/images/") ||
          url.pathname.startsWith("/fonts/") ||
          url.pathname === "/_next/image"),
      handler: new CacheFirst({
        cacheName: "jwalamala-assets",
        plugins: [
          new ExpirationPlugin({ maxEntries: 250, maxAgeSeconds: 86400 * 30 }),
        ],
      }),
    },
    {
      matcher: ({ url }) => url.hostname === "i.ytimg.com",
      handler: new CacheFirst({
        cacheName: "jwalamala-thumbnails",
        plugins: [
          new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 86400 * 7 }),
        ],
      }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});
serwist.addEventListeners();
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
  if (
    event.data?.type === "CACHE_ARTICLE" &&
    typeof event.data.url === "string"
  ) {
    const url = new URL(event.data.url, self.location.origin);
    if (publicPage(url) && /^\/(news|video)\/[^/]+$/.test(url.pathname))
      event.waitUntil(
        fetch(url.href, { credentials: "omit" }).then(async (response) => {
          if (response.ok)
            (await caches.open("jwalamala-pages")).put(url.href, response);
        }),
      );
  }
});
self.addEventListener("push", (event) => {
  let data: {
    title?: string;
    body?: string;
    url?: string;
    image?: string;
    click_token?: string;
    tag?: string;
  } = {};
  try {
    data = event.data?.json() || {};
  } catch {
    return;
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "ಜ್ವಾಲಾಮಾಲಾ ನ್ಯೂಸ್", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      ...(data.image ? { image: data.image } : {}),
      ...{
        actions: [
          { action: "read", title: "ಓದಿ" },
          { action: "later", title: "ನಂತರ" },
        ],
      },
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
  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin,
  );
  event.waitUntil(
    self.clients.openWindow(
      url.origin === self.location.origin ? url.href : self.location.origin,
    ),
  );
});
