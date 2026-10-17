import { requirePermission } from "@/lib/v4/permissions";
import { toCsv } from "@/lib/v4/csv";
export async function GET() {
  const { db } = await requirePermission("analytics.read");
  const { data, error } = await db
    .from("post_engagement_daily")
    .select("*")
    .order("day", { ascending: false })
    .limit(10000);
  if (error) return new Response(null, { status: 503 });
  return new Response(
    "\uFEFF" +
      toCsv(data || [], [
        "day",
        "post_id",
        "views",
        "engaged_seconds",
        "share_clicks",
        "listen_plays",
        "video_plays",
        "push_clicks",
      ]),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="jwalamala-analytics.csv"',
        "Cache-Control": "private, no-store",
      },
    },
  );
}
