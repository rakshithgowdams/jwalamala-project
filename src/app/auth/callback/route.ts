import { NextResponse, type NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { safeReturnPath } from "@/lib/utils/dates";
import { loginPath } from "@/lib/auth/paths";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeReturnPath(params.get("next"));
  const login = new URL(loginPath(next), request.url);
  login.searchParams.set("error", "auth");
  let destination = login;
  try {
    const db = await getServerClient();
    const code = params.get("code");
    const tokenHash = params.get("token_hash");
    const type = params.get("type");
    if (db && !params.has("error")) {
      if (code) {
        const { error } = await db.auth.exchangeCodeForSession(code);
        if (!error) destination = new URL(next, request.url);
      } else if (tokenHash && (type === "signup" || type === "recovery")) {
        const { error } = await db.auth.verifyOtp({
          token_hash: tokenHash,
          type,
        });
        if (!error)
          destination = new URL(
            type === "recovery" ? "/account/password" : next,
            request.url,
          );
      }
    }
  } catch {
    // Never render provider errors or sensitive callback values.
  }
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
