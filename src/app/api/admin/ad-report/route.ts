import { requirePermission } from "@/lib/v4/permissions";
import { toCsv } from "@/lib/v4/csv";
export async function GET() {
  const { db } = await requirePermission("ads.manage");
  const { data, error } = await db
    .from("ad_stats_daily")
    .select("*")
    .order("day", { ascending: false })
    .limit(10000);
  if (error) return new Response(null, { status: 503 });
  return new Response(
    "\uFEFF" +
      toCsv(data || [], [
        "day",
        "ad_id",
        "slot_key",
        "device",
        "impressions",
        "clicks",
      ]),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="jwalamala-ads.csv"',
        "Cache-Control": "private, no-store",
      },
    },
  );
}
