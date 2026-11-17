import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/** PostgREST caps each response at 1000 rows, so page until a short page. */
const TAG_PAGE = 1000;
const TAG_MAX = 10000;

async function allTags(db: SupabaseClient) {
  const rows: { id: string; name_kn: string }[] = [];
  for (let from = 0; from < TAG_MAX; from += TAG_PAGE) {
    const { data, error } = await db
      .from("tags")
      .select("id,name_kn")
      .order("name_kn")
      .order("id")
      .range(from, from + TAG_PAGE - 1);
    if (error) break;
    rows.push(...(data || []));
    if (!data || data.length < TAG_PAGE) break;
  }
  return { data: rows };
}

export async function editorChoices(db: SupabaseClient) {
  const [tags, places, authors, events, mathas, publish] = await Promise.all([
    allTags(db),
    db
      .from("places")
      .select("id,name_kn,name_en,district,is_district")
      .order("is_district", { ascending: false })
      .order("name_kn")
      .limit(2000),
    db
      .from("authors")
      .select("id,name_kn")
      .eq("is_active", true)
      .order("name_kn")
      .limit(500),
    db
      .from("events")
      .select("id,name_kn")
      .order("start_date", { ascending: false })
      .limit(200),
    db
      .from("mathas")
      .select("id,name_kn,slug")
      .eq("is_active", true)
      .order("sort_order")
      .limit(200),
    db.rpc("has_permission", { requested: "content.publish" }),
  ]);
  return {
    choices: {
      tags: tags.data || [],
      places: places.data || [],
      authors: authors.data || [],
      events: events.data || [],
      mathas: mathas.data || [],
    },
    canPublish: publish.data === true,
  };
}
