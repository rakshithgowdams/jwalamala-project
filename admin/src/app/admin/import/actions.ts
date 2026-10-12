"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { importRowSchema, textToHtml } from "@/lib/v4/import";
import { normalizeVideo } from "@/lib/utils/video";
import { getUiStrings } from "@/lib/i18n/server";
export async function beginImport(fileName: string, total: number) {
  const { db, user } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
  if (!Number.isInteger(total) || total < 1 || total > 200)
    return {
      error: tr({
        en: "At most 200 rows.",
        kn: "ಗರಿಷ್ಠ 200 ಸಾಲುಗಳು.",
        hi: "अधिकतम 200 पंक्तियाँ।",
      }),
    };
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
  return error
    ? {
        error: tr({
          en: "The import could not start.",
          kn: "ಆಮದು ಆರಂಭವಾಗಲಿಲ್ಲ.",
          hi: "आयात शुरू नहीं हो सका।",
        }),
      }
    : { id: String(data.id) };
}
export async function importBatch(
  job: string,
  category: string,
  rows: { number: number; data: unknown }[],
) {
  const { db } = await requirePermission("content.edit");
  const { tr } = await getUiStrings();
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
    return {
      error: tr({
        en: "Check the details.",
        kn: "ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "विवरण जाँचें।",
      }),
    };
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
      if (r.video_url && !video)
        problem = tr({
          en: "Video URL is not supported.",
          kn: "ವೀಡಿಯೊ URL ಬೆಂಬಲಿತವಲ್ಲ.",
          hi: "वीडियो URL समर्थित नहीं है।",
        });
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
        error: tr({
          en: "The import stopped. Resume the same job again.",
          kn: "ಆಮದು ಸ್ಥಗಿತಗೊಂಡಿದೆ. ಅದೇ ಕೆಲಸವನ್ನು ಮತ್ತೆ ಮುಂದುವರಿಸಿ.",
          hi: "आयात रुक गया है। उसी काम को फिर से जारी रखें।",
        }),
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
