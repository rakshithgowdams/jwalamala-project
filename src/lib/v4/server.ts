import "server-only";
import {
  createHash,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
export async function readJson(
  request: Request,
  limit = 24000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new Error("too-large");
    }
    chunks.push(value);
  }
  const data = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    data.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(data));
}
export function sameOrigin(request: Request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}
export function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export async function checkCaptcha(token: string, expectedHostname: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return false;
  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token }),
      signal: AbortSignal.timeout(8000),
    },
  );
  const result: unknown = await response.json();
  return (
    !!result &&
    typeof result === "object" &&
    "success" in result &&
    result.success === true &&
    "hostname" in result &&
    result.hostname === expectedHostname
  );
}
export async function requestIdentity(request: NextRequest) {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) return null;
  const cookie = request.cookies.get("jwalamala-device")?.value || "";
  const [value, signature] = cookie.split(".");
  const sign = (text: string) =>
    createHmac("sha256", secret).update(text).digest("hex");
  const valid =
    !!value &&
    !!signature &&
    /^[0-9a-f-]{36}$/.test(value) &&
    /^[0-9a-f]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(sign(value)));
  const device = valid ? value : randomUUID();
  const trustedIp =
    process.env.TRUST_PROXY_IP === "true"
      ? request.headers.get("cf-connecting-ip") ||
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown"
      : "unknown";
  return {
    deviceHash: digest(secret + device),
    ipHash: digest(secret + trustedIp),
    cookie: device + "." + sign(device),
    isNew: !valid,
  };
}
export async function limitRequest(key: string, max = 12, seconds = 3600) {
  const db = getAdminClient();
  if (!db) return false;
  const { data, error } = await db.rpc("v4_rate_limit", {
    bucket: key,
    max_requests: max,
    window_seconds: seconds,
  });
  return !error && data === true;
}
export function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
