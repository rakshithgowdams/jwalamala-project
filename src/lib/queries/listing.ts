import "server-only";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { getPosts } from "./content";
import { filterPosts, searchTerms, type Filters } from "@/lib/utils/search";
import type { Post } from "@/lib/types";
import { getV4Rows } from "@/lib/v4/queries";
import { matchesLocation, resolvePlace } from "@/lib/utils/geography";
const text = z.string().max(300).catch("");
const schema = z.object({
  q: text,
  mode: text,
  from: z.iso.date().or(z.literal("")).catch(""),
  to: z.iso.date().or(z.literal("")).catch(""),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .catch(""),
  category: text,
  place: text,
  state: text,
  district: text,
  city: text,
  type: z.enum(["article", "video", "short", ""]).catch(""),
  sort: z
    .enum(["newest", "oldest", "event_date", "most_viewed"])
    .catch("newest"),
  tag: text,
  author: text,
  place_id: z.uuid().or(z.literal("")).catch(""),
  topic: text,
  series: text,
  media: z.boolean().catch(false),
  live: z.boolean().catch(false),
});
export async function getListing(
  input: Filters & {
    tag?: string;
    author?: string;
    place_id?: string;
    topic?: string;
    series?: string;
    media?: boolean;
    live?: boolean;
  },
  pageValue?: string,
  size = 12,
): Promise<{ rows: Post[]; total: number; page: number; pages: number }> {
  const filters = schema.parse(input);
  const page = Math.max(1, Math.min(10000, Math.floor(Number(pageValue)) || 1));
  if (site.demo) {
    const places = await getV4Rows("places");
    const all = filterPosts(await getPosts(), filters).filter(
      (p) =>
        matchesLocation(
          resolvePlace(places, p.place_id, p.event_place),
          filters,
        ) &&
        (!filters.place_id ||
          resolvePlace(places, p.place_id, p.event_place)?.id ===
            filters.place_id) &&
        (!filters.media || p.type !== "article") &&
        (!filters.live || p.is_live) &&
        (!filters.tag || p.tags?.some((t) => t.slug === filters.tag)),
    );
    return {
      rows: all.slice((page - 1) * size, page * size),
      total: all.length,
      page,
      pages: Math.max(1, Math.ceil(all.length / size)),
    };
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { rows: [], total: 0, page, pages: 1 };
  const db = createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("list_public_posts", {
    filters: { ...filters, terms: searchTerms(filters.q).slice(0, 20) },
    page_size: size,
    page_offset: (page - 1) * size,
  });
  if (error) return { rows: [], total: 0, page, pages: 1 };
  const total = Number(data?.[0]?.total_count || 0);
  return {
    rows: (data || []).map((r: { post: Post }) => r.post),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / size)),
  };
}
