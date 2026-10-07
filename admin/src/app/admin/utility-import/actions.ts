"use server";
import { requirePermission } from "@/lib/v4/permissions";
import {
  parseUtilityRow,
  utilityFields,
  type UtilityResource,
} from "@/lib/v4/utility-import";
import { z } from "zod";
import { revalidatePath } from "next/cache";
export async function importUtility(
  resource: UtilityResource,
  rows: Record<string, string>[],
) {
  const { db } = await requirePermission("content.edit");
  if (
    !Object.hasOwn(utilityFields, resource) ||
    !z
      .array(z.record(z.string().max(60), z.string().max(20000)))
      .min(1)
      .max(20)
      .safeParse(rows).success
  )
    throw Error("Invalid batch");
  const results = [];
  for (const [index, row] of rows.entries()) {
    const parsed = parseUtilityRow(resource, row);
    if (!parsed.success) {
      results.push({
        row: index + 1,
        status: "invalid",
        detail: parsed.error.issues
          .map((i) => i.path.join(".") + ": " + i.message)
          .join("; "),
      });
      continue;
    }
    const conflict = {
      jain_calendar_days: "date,title_kn",
      reservoir_readings: "reservoir_slug,reading_date",
      market_rates: "rate_date,kind,place_id",
    }[resource];
    const { error } = await db
      .from(resource)
      .upsert({ ...parsed.data } as Record<string, unknown>, {
        onConflict: conflict,
      });
    results.push({
      row: index + 1,
      status: error ? "failed" : "saved",
      detail: error ? "Database rejected the row" : "",
    });
  }
  revalidatePath("/", "layout");
  return results;
}
