import { site } from "@/config/site";
import { supabaseFetch } from "./fetch";
import { createBrowserClient } from "@supabase/ssr";
export function getBrowserClient() {
  if (site.demo) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return url && key
    ? createBrowserClient(url, key, { global: { fetch: supabaseFetch } })
    : null;
}
