import { getV4Rows } from "@/lib/v4/queries";
import { cleanHtml } from "@/lib/utils/sanitize";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (
    !(await getV4Rows("liveblogs")).some(
      (blog) => blog.id === id && blog.status === "published",
    )
  )
    return Response.json({ error: "not-found" }, { status: 404 });
  const updates = (await getV4Rows("liveblog_updates"))
    .filter((update) => update.liveblog_id === id)
    .map((update) => ({ ...update, body_html: cleanHtml(update.body_html) }));
  return Response.json(
    { updates },
    { headers: { "Cache-Control": "no-store" } },
  );
}
