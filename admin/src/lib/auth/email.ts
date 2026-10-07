import type { SupabaseClient } from "@supabase/supabase-js";
import { safeReturnPath } from "@/lib/utils/dates";

export type EmailMode = "login" | "signup" | "reset";
export const MIN_PASSWORD_LENGTH = 8;
export function authCallbackUrl(origin: string, next?: string) {
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", safeReturnPath(next));
  return url.href;
}
export async function submitEmailAuth(
  auth: SupabaseClient["auth"],
  input: {
    mode: EmailMode;
    email: string;
    password: string;
    origin: string;
    next: string;
    fullName?: string;
  },
): Promise<"signed-in" | "confirmation-sent" | "reset-sent"> {
  const email = input.email.trim();
  if (input.mode === "reset") {
    const { error } = await auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl(input.origin, "/account/password"),
    });
    if (error) throw error;
    return "reset-sent";
  }
  if (input.mode === "signup") {
    const { data, error } = await auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: authCallbackUrl(input.origin, input.next),
        ...(input.fullName ? { data: { full_name: input.fullName.trim().slice(0, 100) } } : {}),
      },
    });
    if (error) throw error;
    return data.session ? "signed-in" : "confirmation-sent";
  }
  const { error } = await auth.signInWithPassword({
    email,
    password: input.password,
  });
  if (error) throw error;
  return "signed-in";
}
export function isAuthRateLimited(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const status = "status" in error ? (error as { status?: unknown }).status : undefined;
  const code = "code" in error ? (error as { code?: unknown }).code : undefined;
  return status === 429 || (typeof code === "string" && code.includes("rate_limit"));
}
