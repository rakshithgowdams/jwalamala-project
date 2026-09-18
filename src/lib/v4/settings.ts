import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
export const getSetting = cache(async (key: string): Promise<unknown> => {
  if (site.demo) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    token = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !token) return null;
  const db = createClient(url, token, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false },
  });
  const { data, error } = await db
    .from("site_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return error ? null : (data?.value ?? null);
});
