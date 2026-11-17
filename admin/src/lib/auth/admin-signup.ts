import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { site } from "@/config/site";

export const SIGNUP_COOKIE = "jwalamala-admin-signup";
export const CODE_TTL_SECONDS = 10 * 60;

/** New admin accounts are approved by whoever reads this inbox. */
export function approvalEmail() {
  return (
    process.env.ADMIN_APPROVAL_EMAIL || "jwalamala.developers@gmail.com"
  ).trim();
}

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return name.slice(0, 3) + "\u2022\u2022\u2022@" + domain;
}

/** Legacy Supabase keys are JWTs naming their project and role; new sb_ keys are opaque. */
function keyClaims(key: string): { ref?: string; role?: string } | null {
  const [, payload] = key.split(".");
  if (!key.startsWith("eyJ") || !payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
}

/** What stops admin sign-up from working, described without revealing values. */
export function signupSetupProblems() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const problems: string[] = [];
  if (site.demo) problems.push("Set NEXT_PUBLIC_DEMO_MODE=false");
  for (const [name, value] of Object.entries({
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  }))
    if (!value) problems.push(`Add ${name}`);
  let project = "";
  try {
    project = new URL(url).hostname.split(".")[0];
  } catch {
    if (url) problems.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
  }
  const anonClaims = keyClaims(anon),
    serviceClaims = keyClaims(service);
  if (project && anonClaims?.ref && anonClaims.ref !== project)
    problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is from a different Supabase project than the URL");
  if (project && serviceClaims?.ref && serviceClaims.ref !== project)
    problems.push("SUPABASE_SERVICE_ROLE_KEY is from a different Supabase project than the URL");
  if (serviceClaims?.role && serviceClaims.role !== "service_role")
    problems.push("SUPABASE_SERVICE_ROLE_KEY is not the service_role key");
  if (service && (service === anon || service.startsWith("sb_publishable_")))
    problems.push("SUPABASE_SERVICE_ROLE_KEY must be the secret key, not the public one");
  return problems;
}

export function signupConfigured() {
  return signupSetupProblems().length === 0;
}

/** Shown to visitors; the precise cause goes to the server log. */
export const serviceUnavailable =
  "Admin sign-up is temporarily unavailable. Please try again later.";

export function logSignupError(step: string, detail: unknown) {
  const text =
    detail && typeof detail === "object" && "message" in detail
      ? String((detail as { message: unknown }).message)
      : String(detail);
  console.error(`[admin-signup] ${step}: ${text.slice(0, 300)}`);
}

type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

/** Distinguishes "over the limit" from "could not check the limit". */
export async function checkLimit(
  db: RpcClient,
  bucket: string,
  max: number,
  seconds: number,
): Promise<"ok" | "limited" | "error"> {
  const { data, error } = await db.rpc("v4_rate_limit", {
    bucket,
    max_requests: max,
    window_seconds: seconds,
  });
  if (error) {
    logSignupError("rate limit check failed", error);
    return "error";
  }
  return data === true ? "ok" : "limited";
}

export type PendingSignup = {
  uid: string;
  email: string;
  name: string;
  exp: number;
  /** HMAC of the code, never the code itself. */
  code: string;
};

const signingKey = () =>
  process.env.ADMIN_OTP_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sign = (key: string, text: string) =>
  createHmac("sha256", key).update(text).digest("hex");
const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export function sealPending(
  account: Pick<PendingSignup, "uid" | "email" | "name">,
  code: string,
) {
  const key = signingKey();
  if (!key) throw new Error("Missing signing key");
  const exp = Date.now() + CODE_TTL_SECONDS * 1000;
  const pending: PendingSignup = {
    ...account,
    exp,
    code: sign(key, `${account.uid}:${exp}:${code}`),
  };
  const body = Buffer.from(JSON.stringify(pending)).toString("base64url");
  return body + "." + sign(key, body);
}

/** Returns the pending request even after the code expires, so it can be resent. */
export function openPending(value: string | undefined): PendingSignup | null {
  const key = signingKey();
  if (!key || !value) return null;
  const [body, signature] = value.split(".");
  if (!body || !signature || !same(signature, sign(key, body))) return null;
  try {
    const pending = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof pending?.uid === "string" &&
      typeof pending?.email === "string" &&
      typeof pending?.exp === "number" &&
      typeof pending?.code === "string"
      ? (pending as PendingSignup)
      : null;
  } catch {
    return null;
  }
}

export function codeMatches(pending: PendingSignup, code: string) {
  return (
    /^\d{6}$/.test(code) &&
    same(pending.code, sign(signingKey(), `${pending.uid}:${pending.exp}:${code}`))
  );
}

const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

export async function sendApprovalCode(
  account: { name: string; email: string },
  code: string,
) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Email is not configured");
  const from =
    process.env.ADMIN_EMAIL_FROM ||
    process.env.NEWSLETTER_FROM ||
    `${site.englishName} Admin <onboarding@resend.dev>`;
  const minutes = CODE_TTL_SECONDS / 60;
  const name = escapeHtml(account.name),
    email = escapeHtml(account.email);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [approvalEmail()],
      subject: `New admin account request: ${account.email}`,
      text: [
        `${account.name} (${account.email}) asked for an admin account on ${site.englishName}.`,
        ``,
        `Approval code: ${code}`,
        ``,
        `Share this code only if you know this person. It expires in ${minutes} minutes.`,
        `If you did not expect this request, ignore this email and no admin access is granted.`,
      ].join("\n"),
      html: `<div style="font-family:system-ui,sans-serif;max-width:480px;color:#1f2447">
<h2 style="margin:0 0 12px">New admin account request</h2>
<p><strong>${name}</strong> (${email}) asked for an admin account on ${escapeHtml(site.englishName)}.</p>
<p style="font-size:30px;letter-spacing:8px;font-weight:700;margin:24px 0">${code}</p>
<p>Share this code only if you know this person. It expires in ${minutes} minutes.</p>
<p style="color:#666">If you did not expect this request, ignore this email and no admin access is granted.</p>
</div>`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    logSignupError(`Resend rejected the email (${response.status})`, reason);
    throw new EmailError(response.status);
  }
}

export class EmailError extends Error {
  constructor(readonly status: number) {
    super("Email delivery failed");
  }
}

const development = process.env.NODE_ENV === "development";

/** Setup hints name settings, so only developers see them. */
export function emailErrorMessage(error: unknown) {
  if (error instanceof EmailError && error.status === 429)
    return "The email service is busy. Please wait a minute and try again.";
  if (development && error instanceof EmailError && (error.status === 401 || error.status === 403))
    return "Resend refused the email. Check RESEND_API_KEY, and verify the sender domain in Resend (with onboarding@resend.dev, ADMIN_APPROVAL_EMAIL must be the Resend account's own email).";
  return "The approval email could not be sent. Please try again later.";
}

export function databaseErrorMessage() {
  return development
    ? "Supabase rejected the server key. Check SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in admin/.env.local are from the same project, then restart."
    : serviceUnavailable;
}
