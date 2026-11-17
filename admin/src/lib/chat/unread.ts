/** Shared unread chat counts for room list + admin nav badge. */

const STORAGE_KEY = "jwalamala-chat-unread";
const EVENT = "jwalamala-chat-unread";

export type ChatUnreadMap = Record<string, number>;

function readMap(): ChatUnreadMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const next: ChatUnreadMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(value);
      if (key && Number.isFinite(n) && n > 0) next[key] = Math.min(999, Math.floor(n));
    }
    return next;
  } catch {
    return {};
  }
}

function writeMap(map: ChatUnreadMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: map }));
}

export function getChatUnreadMap(): ChatUnreadMap {
  return readMap();
}

export function getChatUnreadTotal(map: ChatUnreadMap = readMap()) {
  return Object.values(map).reduce((sum, n) => sum + n, 0);
}

export function setChatUnreadMap(map: ChatUnreadMap) {
  const cleaned: ChatUnreadMap = {};
  for (const [key, value] of Object.entries(map)) {
    if (value > 0) cleaned[key] = Math.min(999, Math.floor(value));
  }
  writeMap(cleaned);
}

export function bumpChatUnread(roomId: string, by = 1) {
  if (!roomId || by <= 0) return readMap();
  const map = readMap();
  map[roomId] = Math.min(999, (map[roomId] || 0) + by);
  writeMap(map);
  return map;
}

export function clearChatUnread(roomId: string) {
  if (!roomId) return readMap();
  const map = readMap();
  if (!map[roomId]) return map;
  delete map[roomId];
  writeMap(map);
  return map;
}

export function subscribeChatUnread(listener: (map: ChatUnreadMap) => void) {
  if (typeof window === "undefined") return () => undefined;
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener(readMap());
  };
  const onLocal = (event: Event) => {
    const detail = (event as CustomEvent<ChatUnreadMap>).detail;
    listener(detail || readMap());
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onLocal as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onLocal as EventListener);
  };
}
