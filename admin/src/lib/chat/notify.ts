/** Soft desk chime + optional OS notifications for inbound staff-chat messages. */

let audioCtx: AudioContext | null = null;
let lastPlay = 0;
let lastNotify = 0;

function context() {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

export function unlockChatSound() {
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();
}

export function playChatNotifySound() {
  const now = Date.now();
  if (now - lastPlay < 180) return;
  lastPlay = now;
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.1, t0 + 0.012);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
  master.connect(ctx.destination);

  for (const [offset, freq] of [
    [0, 880],
    [0.09, 1174.7],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + offset);
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.7, t0 + offset + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.18);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.2);
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
