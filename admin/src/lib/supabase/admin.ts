import { site } from "@/config/site";
import { supabaseFetch } from "./fetch";
import "server-only";
import { createClient } from "@supabase/supabase-js";
/** The service key is restricted to trusted server tasks. Every caller must authorize its operation. */
export function getAdminClient() {
  if (site.demo) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key
    ? createClient(url, key, {
        global: { fetch: supabaseFetch },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
}
