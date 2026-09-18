import { supabaseFetch } from "@/lib/supabase/fetch";
import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { v4Demo } from "@/lib/v4/demo";
import { demoPosts, demoEvents, categories } from "@/lib/data/demo";
import type { Post, NewsEvent, Category } from "@/lib/types";
function publicDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export const getPosts = cache(async (): Promise<Post[]> => {
  if (site.demo)
    return demoPosts.map((post) => ({
      ...post,
      tags: v4Demo.post_tags
        .filter((link) => link.post_id === post.id)
        .flatMap((link) => v4Demo.tags.filter((tag) => tag.id === link.tag_id)),
    }));
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db
    .from("posts")
    .select(
      "*,key_points(seconds,label_kn),post_categories(categories(slug)),post_tags(tags(slug,name_kn))",
    )
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data || []).map((p) => ({
    ...p,
    tags: (
      (p.post_tags as { tags: { slug: string; name_kn: string } | null }[]) ||
      []
    ).flatMap((link) => (link.tags ? [link.tags] : [])),
    category_slugs: (
      p.post_categories as { categories: { slug: string } | null }[]
    ).flatMap((c) => (c.categories ? [c.categories.slug] : [])),
  })) as Post[];
});
export const getCategories = cache(async (): Promise<Category[]> => {
  if (site.demo) return categories;
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw error;
  return data || [];
});
export const getEvents = cache(async (): Promise<NewsEvent[]> => {
  if (site.demo) return demoEvents;
  const db = publicDb();
  if (!db) return [];
  const { data, error } = await db
    .from("events")
    .select("*")
    .order("start_date");
  if (error) throw error;
  return data || [];
});
export async function getPost(slug: string) {
  if (site.demo) return demoPosts.find((p) => p.slug === slug);
  const db = publicDb();
  if (!db) return undefined;
  const { data, error } = await db
    .from("posts")
    .select(
      "*,key_points(seconds,label_kn),post_categories(categories(slug)),post_tags(tags(slug,name_kn))",
    )
    .eq("slug", slug)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw error;
  if (!data) return undefined;
  return {
    ...data,
    tags: (
      (data.post_tags as {
        tags: { slug: string; name_kn: string } | null;
      }[]) || []
    ).flatMap((link) => (link.tags ? [link.tags] : [])),
    category_slugs: (
      data.post_categories as { categories: { slug: string } | null }[]
    ).flatMap((c) => (c.categories ? [c.categories.slug] : [])),
  } as Post;
}
