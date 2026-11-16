/** Staff chat accepts plain text and http(s) links only — never images or video. */

const MEDIA_EXT =
  /\.(png|jpe?g|gif|webp|svg|bmp|ico|mp4|webm|mov|m4v|avi|mkv|mpeg|mpg|3gp)(\?|#|$)/i;
const DATA_MEDIA = /^data:(image|video)\//i;
const MD_IMAGE = /!\[[^\]]*]\([^)]+\)/;

export type ChatKind = "text" | "url" | "system";

export type ChatBodyResult =
  | { ok: true; body: string; kind: ChatKind }
  | { ok: false; error: string };

export function validateChatBody(raw: string, allowSystem = false): ChatBodyResult {
  const body = String(raw || "").trim().slice(0, 4000);
  if (!body) return { ok: false, error: "Message cannot be empty." };
  if (DATA_MEDIA.test(body) || MD_IMAGE.test(body) || MEDIA_EXT.test(body))
    return {
      ok: false,
      error: "Images and videos are not allowed. Send text or a normal web link only.",
    };
  if (/^https?:\/\//i.test(body)) {
    try {
      const url = new URL(body);
      if (url.protocol !== "http:" && url.protocol !== "https:")
        return { ok: false, error: "Only http and https links are allowed." };
      if (MEDIA_EXT.test(url.pathname))
        return { ok: false, error: "Media file links are not allowed." };
      return { ok: true, body: url.toString(), kind: "url" };
    } catch {
      return { ok: false, error: "That link is not valid." };
    }
  }
  if (allowSystem && body.startsWith("[system]"))
    return { ok: true, body: body.replace(/^\[system]\s*/i, ""), kind: "system" };
  return { ok: true, body, kind: "text" };
}

/** Turn bare URLs inside a text message into clickable anchors (safe http/https only). */
export function linkify(text: string): { type: "text" | "link"; value: string }[] {
  const parts: { type: "text" | "link"; value: string }[] = [];
  const re = /https?:\/\/[^\s<>"']+/gi;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ type: "text", value: text.slice(last, match.index) });
    const candidate = match[0].replace(/[),.;:!?]+$/, "");
    try {
      const url = new URL(candidate);
      if ((url.protocol === "http:" || url.protocol === "https:") && !MEDIA_EXT.test(url.pathname))
        parts.push({ type: "link", value: url.toString() });
      else parts.push({ type: "text", value: match[0] });
    } catch {
      parts.push({ type: "text", value: match[0] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ type: "text", value: text.slice(last) });
  return parts.length ? parts : [{ type: "text", value: text }];
}
