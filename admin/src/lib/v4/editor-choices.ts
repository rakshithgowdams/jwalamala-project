import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultHome, homeSchema } from "@/lib/v4/home";

export async function editorChoices(db: SupabaseClient) {
  const [tags, places, authors, events, mathas, homeSetting, publish] =
    await Promise.all([
      db.from("tags").select("id,name_kn").order("name_kn").limit(500),
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
      db.from("site_settings").select("value").eq("key", "homepage").maybeSingle(),
      db.rpc("has_permission", { requested: "content.publish" }),
    ]);
  const home = homeSchema
    .catch(defaultHome)
    .parse(homeSetting.data?.value || defaultHome);
  let latestLabels: { id: string; title_kn: string }[] = [];
  if (home.latest_ids.length) {
    const { data: pinned } = await db
      .from("posts")
      .select("id,title_kn")
      .in("id", home.latest_ids);
    const titleById = new Map((pinned || []).map((row) => [row.id, row.title_kn]));
    latestLabels = home.latest_ids.map((id) => ({
      id,
      title_kn: titleById.get(id) || id,
    }));
  }
  return {
    choices: {
      tags: tags.data || [],
      places: places.data || [],
      authors: authors.data || [],
      events: events.data || [],
      mathas: mathas.data || [],
      latestIds: home.latest_ids,
      latestLabels,
    },
    canPublish: publish.data === true,
  };
}
