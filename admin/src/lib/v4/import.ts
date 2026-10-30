import { z } from "zod";
export function parseCsv(text: string): Record<string, string>[] {
  if (text.length > 1000000) throw Error("CSV ಗರಿಷ್ಠ 1 MB.");
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
      continue;
    }
    if (c === '"') {
      if (cell || closed) throw Error("CSV ಉಲ್ಲೇಖ ಚಿಹ್ನೆ ದೋಷ.");
      quoted = true;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        if (row.some(Boolean)) rows.push(row);
        row = [];
        if (rows.length > 201) throw Error("ಒಮ್ಮೆ ಗರಿಷ್ಠ 200 ಸಾಲುಗಳು.");
      }
    } else {
      if (closed && !/\s/.test(c)) throw Error("CSV ಉಲ್ಲೇಖ ಚಿಹ್ನೆಯ ನಂತರ ದೋಷ.");
      if (!closed) cell += c;
    }
  }
  if (quoted) throw Error("CSV ಉಲ್ಲೇಖ ಚಿಹ್ನೆ ಮುಚ್ಚಿಲ್ಲ.");
  row.push(cell);
  if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map((h) => h.trim()) || [];
  if (
    !headers.length ||
    headers.some((h) => !h) ||
    new Set(headers).size !== headers.length ||
    headers.length > 40
  )
    throw Error("ಶೀರ್ಷಿಕೆಗಳು ಖಾಲಿ ಅಥವಾ ನಕಲು ಇವೆ.");
  if (rows.length > 200) throw Error("ಒಮ್ಮೆ ಗರಿಷ್ಠ 200 ಸಾಲುಗಳು.");
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw Error("ಸಾಲು " + (index + 2) + ": ಕಾಲಮ್ ಸಂಖ್ಯೆ ಹೊಂದಿಲ್ಲ.");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]]));
  });
}
export const importFields = [
  "title_kn",
  "title_en",
  "slug",
  "summary_kn",
  "body_text",
  "event_date",
  "event_place",
  "image_credit",
  "video_url",
] as const;
export const importRowSchema = z.object({
  title_kn: z.string().trim().min(3).max(300),
  title_en: z.string().max(300).default(""),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(150),
  summary_kn: z.string().max(1000).default(""),
  body_text: z.string().max(50000).default(""),
  event_date: z.iso.date(),
  event_place: z.string().max(150).default(""),
  image_credit: z.string().max(200).default(""),
  video_url: z.union([z.url().max(2000), z.literal("")]).default(""),
});
export function mapImportRow(
  row: Record<string, string>,
  mapping: Record<string, string>,
) {
  return Object.fromEntries(
    importFields.map((field) => [field, row[mapping[field]] || ""]),
  );
}
export function textToHtml(text: string) {
  return text
    .split(/\r?\n\s*\r?\n/)
    .map(
      (p) =>
        "<p>" +
        p
          .replaceAll("&", "&amp;")
          .replaceAll("<", "&lt;")
          .replaceAll(">", "&gt;")
          .replaceAll("\n", "<br>") +
        "</p>",
    )
    .join("");
}
