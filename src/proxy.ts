import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { localPath } from "@/lib/v4/redirects";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminPath, loginPath } from "@/lib/auth/paths";
export async function proxy(request: NextRequest) {
  const strict = process.env.ADS_STRICT_CSP === "true";
  const nonce = strict
    ? Buffer.from(crypto.randomUUID()).toString("base64")
    : null;
  const csp = nonce
    ? "object-src 'none'; script-src 'nonce-" +
      nonce +
      "' 'unsafe-inline' 'unsafe-eval' 'strict-dynamic' https: http:; base-uri 'none'; frame-ancestors 'none'"
    : null;
  if (nonce && csp) {
    request.headers.set("x-nonce", nonce);
    request.headers.set("Content-Security-Policy", csp);
  } else request.headers.delete("x-nonce");
  function nextResponse() {
    const response = NextResponse.next({
      request: { headers: request.headers },
    });
    if (csp) response.headers.set("Content-Security-Policy", csp);
    return response;
  }
  let response = nextResponse();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const path = request.nextUrl.pathname;
  const restricted = isAdminPath(path) || path === "/account" || path.startsWith("/account/");
  const privatePage = restricted || /^\/(auth|login|signup|review)(\/|$)/.test(path);
  function finish(result: NextResponse) {
    if (result !== response) {
      for (const cookie of response.cookies.getAll()) result.cookies.set(cookie);
    }
    if (privatePage || response.cookies.getAll().length) result.headers.set("Cache-Control", "private, no-store");
    if (csp) result.headers.set("Content-Security-Policy", csp);
    return result;
  }
  function toLogin() {
    return finish(NextResponse.redirect(new URL(loginPath(path + request.nextUrl.search), request.url)));
  }
  if (site.demo || !url || !key) {
    if (restricted) {
      return toLogin();
    }
    return finish(response);
  }
  try {
    const db = createServerClient(url, key, {
      global: { fetch: supabaseFetch },
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(values) {
          values.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = nextResponse();
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    const {
      data: { user },
    } = await db.auth.getUser();
    if (restricted && !user) {
      return toLogin();
    }
    if (isAdminPath(path) && user) {
      const { data } = await db.rpc("has_permission", {
        requested: "admin.access",
      });
      if (data !== true)
        return finish(NextResponse.redirect(new URL(loginPath(path + request.nextUrl.search) + "&error=access", request.url)));
    }
    if (path === "/") {
      const q = request.nextUrl.searchParams;
      let target: string | null = null;
      if (q.has("s"))
        target = "/search?q=" + encodeURIComponent(q.get("s") || "");
      else if (q.has("m") && /^\d{6}$/.test(q.get("m") || "")) {
        const value = q.get("m")!;
        const year = Number(value.slice(0, 4)),
          month = Number(value.slice(4));
        if (month >= 1 && month <= 12) {
          const last = new Date(year, month, 0).getDate();
          target = `/search?mode=event_date&from=${year}-${value.slice(4)}-01&to=${year}-${value.slice(4)}-${last}`;
        }
      } else if (q.has("p") || q.has("cat") || q.has("page_id")) {
        const param = q.has("p") ? "p" : q.has("cat") ? "cat" : "page_id";
        const old = "/?" + param + "=" + q.get(param);
        const { data } = await db
          .from("redirects")
          .select("new_path")
          .eq("old_path", old)
          .maybeSingle();
        target = data?.new_path || null;
      }
      if (target?.startsWith("/") && !target.startsWith("//"))
        return finish(NextResponse.redirect(new URL(target, request.url), 301));
    }
    if (!restricted && !/^\/(api|auth|review)(\/|$)/.test(path)) {
      const { data: rule } = await db
        .from("redirects")
        .select("new_path")
        .eq("old_path", path)
        .maybeSingle();
      if (
        rule &&
        rule.new_path !== path &&
        localPath.safeParse(rule.new_path).success
      )
        return finish(NextResponse.redirect(new URL(rule.new_path, request.url), 301));
    }
  } catch {
    if (restricted) {
      return toLogin();
    }
  }
  if (
    restricted ||
    path.startsWith("/auth") ||
    path.startsWith("/review/") ||
    path === "/login"
  )
    response.headers.set("Cache-Control", "private, no-store");
  return finish(response);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|fonts/|images/|icons/|sw.js|manifest.webmanifest|favicon.ico).*)",
  ],
};
