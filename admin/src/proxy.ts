import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { isAdminPath, loginPath } from "@/lib/auth/paths";

function authCookieValue(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((cookie) => /^sb-.+-auth-token(?:\.\d+)?$/.test(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }))
    .map((cookie) => cookie.value)
    .join("");
}

/** True when the access token is still valid, so this request can skip a network round-trip. */
function accessTokenIsFresh(request: NextRequest) {
  let raw = authCookieValue(request);
  if (!raw) return false;
  try {
    if (raw.startsWith("base64-")) raw = atob(raw.slice("base64-".length));
    const session = JSON.parse(raw) as {
      access_token?: string;
      expires_at?: number;
    };
    const expMs =
      typeof session.expires_at === "number"
        ? session.expires_at * (session.expires_at > 1e12 ? 1 : 1000)
        : session.access_token
          ? jwtExpMs(session.access_token)
          : 0;
    return expMs > Date.now() + 20_000;
  } catch {
    return false;
  }
}

function jwtExpMs(token: string) {
  const payload = token.split(".")[1];
  if (!payload) return 0;
  const padded =
    payload.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (payload.length % 4)) % 4);
  const exp = JSON.parse(atob(padded)).exp;
  return typeof exp === "number" ? exp * 1000 : 0;
}

/** Every admin screen needs a signed-in account holding admin.access. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const path = request.nextUrl.pathname;
  const restricted = isAdminPath(path);
  const finish = (result: NextResponse) => {
    if (result !== response)
      for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
    result.headers.set("Cache-Control", "private, no-store");
    return result;
  };
  const toLogin = (error?: string) =>
    finish(
      NextResponse.redirect(
        new URL(
          loginPath(path + request.nextUrl.search) +
            (error ? "&error=" + error : ""),
          request.url,
        ),
      ),
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (site.demo || !url || !key) return restricted ? toLogin() : finish(response);
  // Login and other public admin routes must not wait on Auth.
  if (!restricted) return finish(response);
  const hasCookie = Boolean(authCookieValue(request));
  if (!hasCookie) return toLogin();
  // A still-valid access token does not need getUser() here. The layout
  // still verifies the account. This keeps page clicks off an 8s Auth wait.
  if (accessTokenIsFresh(request)) return finish(response);
  try {
    const db = createServerClient(url, key, {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return toLogin();
  } catch {
    // Auth timed out. Keep the editor in if a session cookie is present;
    // kicking them to login is what made page clicks feel like a minute hang.
    if (!hasCookie) return toLogin();
  }
  return finish(response);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|images/|icons/|favicon.ico).*)"],
};
