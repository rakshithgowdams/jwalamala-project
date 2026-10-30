import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/v4/permissions";
import { LiveConsole } from "@/components/admin/v4/LiveConsole";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { db } = await requirePermission("content.edit");
  const { id } = await params;
  const { data: blog } = await db
    .from("liveblogs")
    .select("*")
    .eq("id", id)
    .single();
  if (!blog) notFound();
  const { data: updates } = await db
    .from("liveblog_updates")
    .select("*")
    .eq("liveblog_id", id)
    .order("published_at", { ascending: false });
  return (
    <>
      <h1>{blog.title_kn}</h1>
      <LiveConsole blogId={id} updates={updates || []} isLive={blog.is_live} />
    </>
  );
}
