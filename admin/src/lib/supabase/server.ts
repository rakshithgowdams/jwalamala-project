import { site } from "@/config/site";
import { supabaseFetch } from "./fetch";
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
export async function getServerClient() {
  if (site.demo) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  const jar = await cookies();
  return createServerClient(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, options),
          );
        } catch {
          /* Proxy refreshes cookies outside read-only server components. */
        }
      },
    },
  });
}
