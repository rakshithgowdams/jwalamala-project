import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { isAdminPath, loginPath } from "@/lib/auth/paths";
import { sectionForPath } from "@/lib/admin/sections";

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

function jwtPayload(token: string): { exp?: number; sub?: string } {
  const payload = token.split(".")[1];
  if (!payload) return {};
  const padded =
    payload.replace(/-/g, "+").replace(/_/g, "/") +
    "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

function jwtExpMs(token: string) {
  const exp = jwtPayload(token).exp;
  return typeof exp === "number" ? exp * 1000 : 0;
}

function accessToken(request: NextRequest) {
  let raw = authCookieValue(request);
  if (!raw) return null;
  try {
    if (raw.startsWith("base64-")) raw = atob(raw.slice("base64-".length));
    return (JSON.parse(raw) as { access_token?: string }).access_token || null;
  } catch {
    return null;
  }
}

/**
 * Sidebar features granted to a staff account, or null for every other role.
 * Looked up with the account's own token, so the database still decides what
 * it may read; a short cache keeps page clicks off an extra round-trip.
 */
const staffCache = new Map<string, { at: number; sections: string[] | null }>();
async function staffSections(request: NextRequest, url: string, key: string) {
  const token = accessToken(request);
  const sub = token ? jwtPayload(token).sub : undefined;
  if (!token || !sub) return null;
  const hit = staffCache.get(sub);
  if (hit && Date.now() - hit.at < 30_000) return hit.sections;
  try {
    const result = await fetch(
      `${url}/rest/v1/profiles?select=role,admin_sections&id=eq.${encodeURIComponent(sub)}`,
      {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      },
    );
    if (!result.ok) return null;
    const [row] = (await result.json()) as { role?: string; admin_sections?: string[] | null }[];
    const sections = row?.role === "staff" ? ["", ...(row.admin_sections || [])] : null;
    if (staffCache.size > 500) staffCache.clear();
    staffCache.set(sub, { at: Date.now(), sections });
    return sections;
  } catch {
    return null;
  }
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
  // Staff accounts only open the sidebar features an administrator granted;
  // any other admin page shows "No access" instead.
  const gate = async () => {
    if (path === "/admin/no-access") return finish(response);
    const sections = await staffSections(request, url, key);
    const section = sectionForPath(path);
    // Tasks staff may open the article editor for posts assigned to them.
    const tasksMayEditPost =
      section === "posts" &&
      Boolean(sections?.includes("tasks")) &&
      /^\/admin\/posts\/[^/]+\/?$/.test(path) &&
      !path.endsWith("/new") &&
      !path.includes("/bin");
    if (
      sections &&
      (section === null || (!sections.includes(section) && !tasksMayEditPost))
    )
      return finish(NextResponse.rewrite(new URL("/admin/no-access", request.url)));
    return finish(response);
  };
  // A still-valid access token does not need getUser() here. The layout
  // still verifies the account. This keeps page clicks off an 8s Auth wait.
  if (accessTokenIsFresh(request)) return gate();
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
  return gate();
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|images/|icons/|favicon.ico).*)"],
};
