"use server";
import { cookies } from "next/headers";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabase/admin";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { digest } from "@/lib/v4/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import {
  SIGNUP_COOKIE,
  approvalEmail,
  checkLimit,
  codeMatches,
  databaseErrorMessage,
  emailErrorMessage,
  logSignupError,
  maskEmail,
  newCode,
  openPending,
  sealPending,
  sendApprovalCode,
  serviceUnavailable,
  signupSetupProblems,
  type PendingSignup,
} from "@/lib/auth/admin-signup";

export type SignupResult = { ok: boolean; error?: string; approver?: string };

const requestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(72),
});

const fail = (error: string): SignupResult => ({ ok: false, error });
const expired = fail("This sign-up request has expired. Please start again.");

/** The service-role client, or the reason sign-up cannot run. */
function serverClient() {
  const problems = signupSetupProblems();
  const db = problems.length ? null : getAdminClient();
  if (db) return { db };
  if (problems.length) logSignupError("not configured", problems.join("; "));
  return {
    error: fail(
      process.env.NODE_ENV === "development" && problems.length
        ? "Admin sign-up is not set up: " + problems.join("; ") + "."
        : serviceUnavailable,
    ),
  };
}

const limitMessage = (state: "limited" | "error", limited: string) =>
  fail(state === "limited" ? limited : databaseErrorMessage());

async function sendCode(pending: Pick<PendingSignup, "uid" | "email" | "name">) {
  const code = newCode();
  await sendApprovalCode(pending, code);
  (await cookies()).set(SIGNUP_COOKIE, sealPending(pending, code), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/admin",
    maxAge: 60 * 60,
  });
}

/** Creates the account as a reader and emails an approval code to the owner. */
export async function requestAdminSignup(input: unknown): Promise<SignupResult> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      `Enter your name, a valid email and a password of ${MIN_PASSWORD_LENGTH}-72 characters.`,
    );
  const { db, error: unavailable } = serverClient();
  if (!db) return unavailable;
  const { name, email, password } = parsed.data;

  for (const [bucket, max] of [
    ["admin-signup:" + digest(email), 5],
    ["admin-signup:all", 30],
  ] as const) {
    const state = await checkLimit(db, bucket, max, 3600);
    if (state !== "ok")
      return limitMessage(state, "Too many sign-up attempts. Please try again in an hour.");
  }

  let uid: string;
  const created = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (created.data.user) uid = created.data.user.id;
  else if (
    created.error?.code === "email_exists" ||
    /already/i.test(created.error?.message || "")
  ) {
    // An existing account may ask for admin access only with its own password.
    const reader = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: supabaseFetch }, auth: { persistSession: false } },
    );
    const { data, error } = await reader.auth.signInWithPassword({ email, password });
    if (error || !data.user)
      return fail(
        "An account with this email already exists. Enter its current password to request admin access.",
      );
    uid = data.user.id;
  } else {
    logSignupError("create user failed", created.error);
    return fail(
      created.error?.code === "weak_password"
        ? "Choose a stronger password."
        : databaseErrorMessage(),
    );
  }

  const { data: profile, error: profileError } = await db
    .from("profiles")
    .select("role")
    .eq("id", uid)
    .maybeSingle();
  if (profileError) {
    logSignupError("profile lookup failed", profileError);
    return fail(databaseErrorMessage());
  }
  if (profile?.role === "admin")
    return fail("This account is already an administrator. Sign in instead.");

  try {
    await sendCode({ uid, email, name });
  } catch (error) {
    return fail(emailErrorMessage(error));
  }
  return { ok: true, approver: maskEmail(approvalEmail()) };
}

export async function verifyAdminSignup(code: string): Promise<SignupResult> {
  const { db, error: unavailable } = serverClient();
  if (!db) return unavailable;
  const store = await cookies();
  const pending = openPending(store.get(SIGNUP_COOKIE)?.value);
  if (!pending) return expired;
  const state = await checkLimit(db, "admin-signup-code:" + pending.uid, 5, 900);
  if (state !== "ok")
    return limitMessage(state, "Too many wrong codes. Wait 15 minutes, then send a new code.");
  if (pending.exp < Date.now()) return fail("This code has expired. Send a new code.");
  if (!codeMatches(pending, code.trim())) return fail("That code is not correct.");

  const { data, error } = await db
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", pending.uid)
    .select("role")
    .single();
  if (error || data?.role !== "admin") {
    logSignupError("granting admin failed", error || "role unchanged");
    return fail("Could not grant admin access. Please try again.");
  }
  store.delete({ name: SIGNUP_COOKIE, path: "/auth/admin" });
  return { ok: true, approver: maskEmail(approvalEmail()) };
}

export async function resendAdminCode(): Promise<SignupResult> {
  const { db, error: unavailable } = serverClient();
  if (!db) return unavailable;
  const pending = openPending((await cookies()).get(SIGNUP_COOKIE)?.value);
  if (!pending) return expired;
  const state = await checkLimit(db, "admin-signup-resend:" + pending.uid, 3, 900);
  if (state !== "ok")
    return limitMessage(state, "Too many codes sent. Please wait 15 minutes.");
  try {
    await sendCode(pending);
  } catch (error) {
    return fail(emailErrorMessage(error));
  }
  return { ok: true, approver: maskEmail(approvalEmail()) };
}
