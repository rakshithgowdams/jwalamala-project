import { v4Resources } from "@/lib/v4/admin-schema";
import { notFound, redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { resources, type Resource } from "@/lib/admin/resources";
import { ResourceManager } from "@/components/admin/ResourceManager";
export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resource: string }>;
}) {
  const { resource } = await params;
  const aliases: Record<string, string> = {
    trending: "trending_items",
    "jain-calendar": "jain_calendar_days",
    "live-blogs": "liveblogs",
    "web-stories": "web_stories",
    reservoirs: "reservoir_readings",
    rates: "market_rates",
  };
  const v4Resource = aliases[resource] || resource;
  if (Object.hasOwn(v4Resources, v4Resource))
    redirect("/admin/v4/" + v4Resource);
  if (!Object.hasOwn(resources, resource)) notFound();
  const { db, profile } = await requireStaff();
  if (["users", "settings"].includes(resource) && profile.role !== "admin")
    notFound();
  const table =
    resource === "users"
      ? "profiles"
      : resource === "settings"
        ? "site_settings"
        : resource;
  const { data, error } = await db.from(table).select("*").limit(100);
  if (error) throw error;
  return (
    <>
      <div className="page-heading">
        <h1>{resources[resource as Resource].title}</h1>
      </div>
      <ResourceManager resource={resource as Resource} rows={data || []} />
    </>
  );
}
