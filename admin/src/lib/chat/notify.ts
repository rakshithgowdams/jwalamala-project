/** Soft desk chime for inbound staff-chat messages (no media file required). */

let audioCtx: AudioContext | null = null;
let lastPlay = 0;

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
  if (now - lastPlay < 450) return;
  lastPlay = now;
  const ctx = context();
  if (!ctx) return;
  if (ctx.state === "suspended") void ctx.resume();

  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, t0);
  master.gain.exponentialRampToValueAtTime(0.09, t0 + 0.02);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
  master.connect(ctx.destination);

  for (const [offset, freq] of [
    [0, 880],
    [0.12, 1174.7],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t0 + offset);
    gain.gain.setValueAtTime(0.0001, t0 + offset);
    gain.gain.exponentialRampToValueAtTime(0.7, t0 + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.22);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0 + offset);
    osc.stop(t0 + offset + 0.24);
  }
}
