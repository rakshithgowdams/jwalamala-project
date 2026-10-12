import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/v4/permissions";
import { v4Resources, type V4Resource } from "@/lib/v4/admin-schema";
import {
  ResourceEditor,
  type Choice,
} from "@/components/admin/v4/ResourceEditor";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  if (!Object.hasOwn(v4Resources, resource)) notFound();
  const name = resource as V4Resource,
    config = v4Resources[name];
  const { db } = await requirePermission(config.permission);
  const query = db.from(name).select("*");
  const { data, error } = await (name === "places"
    ? query
        .order("is_district", { ascending: false })
        .order("sort_order")
        .order("name_kn")
        .limit(1000)
    : query.order("created_at", { ascending: false }).limit(200));
  if (error) throw new Error("v4 migration required");
  const choices: Record<string, Choice[]> = {};
  for (const table of [
    "places",
    "tags",
    "events",
    "posts",
    "liveblogs",
    "categories",
    "ad_campaigns",
  ]) {
    const result = await db
      .from(table)
      .select(
        table === "ad_campaigns"
          ? "id,advertiser"
          : table === "posts"
            ? "id,title_kn"
            : table === "liveblogs"
              ? "id,title_kn"
              : table === "places"
                ? "id,name_kn,name_en,district,is_district"
                : "id,name_kn",
      )
      .limit(table === "places" ? 2000 : 500);
    choices[table] = (result.data || []).map(
      (row: Record<string, unknown>) => ({
        id: String(row.id),
        label: String(row.advertiser || row.title_kn || row.name_kn),
        ...(table === "places" && {
          name_kn: String(row.name_kn),
          name_en: (row.name_en as string) || "",
          district: (row.district as string) || "",
          is_district: Boolean(row.is_district),
        }),
      }),
    );
  }
  let relationships: { parent: string; post: string; order: number }[] = [];
  if (name === "topics" || name === "series") {
    const result = await db
      .from(name === "topics" ? "topic_pins" : "series_items")
      .select("*");
    relationships = (result.data || []).map((row) => ({
      parent: row.topic_id || row.series_id,
      post: row.post_id,
      order: row.sort_order ?? row.episode_no,
    }));
  }
  const { l } = await getUiStrings();
  return (
    <>
      <div className="page-heading">
        <h1>{l(config.title)}</h1>
      </div>
      <ResourceEditor
        resource={name}
        rows={data || []}
        choices={choices}
        relationships={relationships}
      />
    </>
  );
}
