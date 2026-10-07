import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export async function editorChoices(db: SupabaseClient) {
  const [tags, places, authors, events, publish] = await Promise.all([
    db.from("tags").select("id,name_kn").order("name_kn").limit(500),
    db.from("places").select("id,name_kn").order("name_kn").limit(500),
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
    db.rpc("has_permission", { requested: "content.publish" }),
  ]);
  return {
    choices: {
      tags: tags.data || [],
      places: places.data || [],
      authors: authors.data || [],
      events: events.data || [],
    },
    canPublish: publish.data === true,
  };
}
