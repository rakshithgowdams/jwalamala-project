"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { importRowSchema, textToHtml } from "@/lib/v4/import";
import { normalizeVideo } from "@/lib/utils/video";
export async function beginImport(fileName: string, total: number) {
  const { db, user } = await requirePermission("content.edit");
  if (!Number.isInteger(total) || total < 1 || total > 200)
    return { error: "ಗರಿಷ್ಠ 200 ಸಾಲುಗಳು." };
  const { data, error } = await db
    .from("import_jobs")
    .insert({
      file_name: fileName.slice(0, 200),
      total_rows: total,
      created_by: user.id,
      status: "running",
    })
    .select("id")
    .single();
  return error ? { error: "ಆಮದು ಆರಂಭವಾಗಲಿಲ್ಲ." } : { id: String(data.id) };
}
export async function importBatch(
  job: string,
  category: string,
  rows: { number: number; data: unknown }[],
) {
  const { db } = await requirePermission("content.edit");
  if (
    !z.uuid().safeParse(job).success ||
    !z.uuid().safeParse(category).success ||
    !z
      .array(
        z.object({
          number: z.number().int().min(1).max(200),
          data: z.unknown(),
        }),
      )
      .min(1)
      .max(10)
      .safeParse(rows).success
  )
    return { error: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ." };
  const results: { row: number; result: string; message: string }[] = [];
  for (const row of rows) {
    const parsed = importRowSchema.safeParse(row.data);
    let payload: Record<string, unknown> = {},
      problem = "";
    if (!parsed.success)
      problem = parsed.error.issues
        .map((i) => i.path.join(".") + ": " + i.message)
        .join("; ")
        .slice(0, 1000);
    else {
      const r = parsed.data,
        video = r.video_url ? normalizeVideo(r.video_url) : null;
      if (r.video_url && !video) problem = "ವೀಡಿಯೊ URL ಬೆಂಬಲಿತವಲ್ಲ.";
      payload = {
        ...r,
        body_html: textToHtml(r.body_text),
        body_json: {
          type: "doc",
          content: r.body_text.split(/\r?\n/).map((text) => ({
            type: "paragraph",
            content: text ? [{ type: "text", text }] : [],
          })),
        },
        title_translit: r.title_en.toLowerCase(),
        status: "draft",
        category_ids: [category],
        primary_category: category,
        type: video ? "video" : "article",
        video_provider: video?.provider || "none",
        video_id: video?.id || null,
        video_url: video?.url || null,
        thumbnail_url:
          video?.provider === "youtube"
            ? "https://i.ytimg.com/vi/" + video.id + "/hqdefault.jpg"
            : "/images/jwalamala-logo.jpg",
        summary_points: [],
        hide_ads: false,
      };
    }
    const { data, error } = await db.rpc("import_draft_row", {
      job,
      row_no: row.number,
      payload,
      validation_error: problem,
    });
    if (error)
      return {
        error: "ಆಮದು ಸ್ಥಗಿತಗೊಂಡಿದೆ. ಅದೇ ಕೆಲಸವನ್ನು ಮತ್ತೆ ಮುಂದುವರಿಸಿ.",
        results,
      };
    results.push({
      row: row.number,
      result: String(data.result),
      message: String(data.message || ""),
    });
  }
  return { results };
}
