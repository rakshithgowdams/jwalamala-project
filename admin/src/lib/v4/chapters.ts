import { z } from "zod";
export const chapterTextSchema = z
  .string()
  .max(20000)
  .transform((value, ctx) => {
    const rows = [];
    for (const line of value.split(/\r?\n/).filter((l) => l.trim())) {
      const m = /^(\d{1,4}):(\d{2})\s+(.{1,300})$/.exec(line.trim());
      if (!m || Number(m[2]) > 59) {
        ctx.addIssue({
          code: "custom",
          message: "Use MM:SS followed by a title",
        });
        return z.NEVER;
      }
      rows.push({ seconds: Number(m[1]) * 60 + Number(m[2]), label_kn: m[3] });
    }
    return rows;
  })
  .pipe(
    z
      .array(
        z.object({
          seconds: z.number().int().min(0).max(172800),
          label_kn: z.string().min(1).max(300),
        }),
      )
      .max(100),
  );
