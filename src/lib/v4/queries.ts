import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { v4Demo } from "./demo";
import type { DataTables, PublicTable } from "./types";
export const getV4Rows = cache(
  async <K extends PublicTable>(table: K): Promise<DataTables[K][]> => {
    if (site.demo) return v4Demo[table];
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
      key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [] as DataTables[K][];
    const db = createClient(url, key, {
      global: { fetch: supabaseFetch },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (table === "places") {
      const rows: DataTables[K][] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await db
          .from(table)
          .select("*")
          .order("id")
          .range(offset, offset + 499);
        if (error) throw new Error("Unable to load places");
        rows.push(...((data || []) as DataTables[K][]));
        if (!data || data.length < 500) return rows;
      }
    }
    const { data, error } = await db.from(table).select("*").limit(500);
    if (error) throw new Error("Unable to load " + table);
    return (data || []) as DataTables[K][];
  },
);
