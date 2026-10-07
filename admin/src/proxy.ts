import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { isAdminPath, loginPath } from "@/lib/auth/paths";

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
    if (!restricted) return finish(response);
    if (!user) return toLogin();
    const { data } = await db.rpc("has_permission", {
      requested: "admin.access",
    });
    if (data !== true) return toLogin("access");
  } catch {
    if (restricted) return toLogin();
  }
  return finish(response);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|fonts/|images/|icons/|favicon.ico).*)"],
};
