/** Desk chime + OS notifications for inbound staff-chat messages. */

const VOLUME_KEY = "jwalamala-chat-notify-volume";
const DEFAULT_VOLUME = 82;

let audioCtx: AudioContext | null = null;
let lastPlay = 0;
let lastNotify = 0;
let cachedVolume: number | null = null;

function context() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

function clampVolume(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getChatNotifyVolume() {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  if (cachedVolume != null) return cachedVolume;
  try {
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw == null) {
      cachedVolume = DEFAULT_VOLUME;
      return cachedVolume;
    }
    cachedVolume = clampVolume(Number(raw));
    return cachedVolume;
  } catch {
    cachedVolume = DEFAULT_VOLUME;
    return cachedVolume;
  }
}

export function setChatNotifyVolume(value: number) {
  const next = clampVolume(value);
  cachedVolume = next;
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(VOLUME_KEY, String(next));
  } catch {
    /* ignore quota / private mode */
  }
  return next;
}

export function unlockChatSound() {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}

/** Louder two-tone desk chime; respects the saved 0–100 volume. */
export function playChatNotifySound(opts?: { preview?: boolean }) {
  const volume = getChatNotifyVolume();
  if (!opts?.preview && volume <= 0) return;

  const now = Date.now();
  if (!opts?.preview && now - lastPlay < 160) return;
  lastPlay = now;

  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const level = Math.max(0.05, (opts?.preview ? Math.max(volume, 35) : volume) / 100);
  const peak = 0.18 + level * 0.62;

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(peak, t0 + 0.014);
  master.gain.exponentialRampToValueAtTime(peak * 0.55, t0 + 0.12);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
  master.connect(ctx.destination);

  for (const [offset, freq, amp] of [
    [0, 784, 0.95],
    [0.08, 1046.5, 1],
    [0.16, 1318.5, 0.72],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + offset);
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(amp, t0 + offset + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.22);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.24);
  }
}

export function chatNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function ensureChatNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  try {
    const result = await Notification.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

export function showChatDesktopNotification(input: {
  title: string;
  body: string;
  tag?: string;
  onClick?: () => void;
}) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const now = Date.now();
  if (now - lastNotify < 120) return;
  lastNotify = now;

  try {
    const note = new Notification(input.title.slice(0, 80) || "Staff chat", {
      body: input.body.slice(0, 180),
      tag: input.tag || "jwalamala-staff-chat",
      renotify: true,
      silent: false,
    });
    note.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      input.onClick?.();
      note.close();
    };
  } catch {
    /* Notification constructor can throw on some browsers */
  }
}
