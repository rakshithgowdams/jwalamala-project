import { z } from "zod";
const text = (max: number) => z.string().trim().min(1).max(max);
export const communitySubmissionSchema = z
  .object({
    org: z.string().trim().max(200).optional(),
    kind: z.enum(["notice", "opportunity", "condolence"]),
    title_kn: text(200),
    body_kn: text(5000),
    name: text(100),
    email: z.email().max(254),
    place_id: z.uuid().nullable().optional(),
    date: z.iso.date(),
    type: z.enum([
      "shraddhanjali",
      "abhinandane",
      "amantrana",
      "anniversary",
      "sanmana",
      "student_achievement",
      "job",
      "scholarship",
      "competition",
      "admission",
      "condolence",
    ]),
    link: z
      .union([
        z.literal(""),
        z.url().refine((value) => new URL(value).protocol === "https:"),
      ])
      .optional(),
    target_id: z.uuid().optional(),
    photo_url: z
      .union([
        z.literal(""),
        z.url().refine((value) => new URL(value).protocol === "https:"),
      ])
      .optional(),
    token: text(2048),
    website: z.literal("").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.kind === "opportunity" && !value.org)
      ctx.addIssue({ code: "custom", message: "Organisation required" });
    const notices = [
      "shraddhanjali",
      "abhinandane",
      "amantrana",
      "anniversary",
      "sanmana",
      "student_achievement",
    ];
    const opportunities = ["job", "scholarship", "competition", "admission"];
    if (
      (value.kind === "notice" && !notices.includes(value.type)) ||
      (value.kind === "opportunity" && !opportunities.includes(value.type)) ||
      (value.kind === "condolence" &&
        (!value.target_id || value.type !== "condolence"))
    )
      ctx.addIssue({ code: "custom", message: "invalid type" });
  });
