import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/v4/permissions";
import { v4Resources, type V4Resource } from "@/lib/v4/admin-schema";
import {
  ResourceEditor,
  type Choice,
} from "@/components/admin/v4/ResourceEditor";
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
  const { data, error } = await db
    .from(name)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
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
              : "id,name_kn",
      )
      .limit(500);
    choices[table] = (result.data || []).map(
      (row: Record<string, unknown>) => ({
        id: String(row.id),
        label: String(row.advertiser || row.title_kn || row.name_kn),
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
  return (
    <>
      <div className="page-heading">
        <h1>{config.title}</h1>
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
