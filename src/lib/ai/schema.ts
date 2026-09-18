import { z } from "zod";
export const aiKinds = [
  "headlines",
  "summary",
  "taxonomy",
  "event",
  "seo",
  "alt",
  "transcript",
  "translate",
  "grammar",
  "social",
] as const;
export type AiKind = (typeof aiKinds)[number];
export const suggestionSchema = z.object({
  suggestions: z
    .array(
      z.object({
        field: z.string().max(60),
        value: z.string().max(20000),
        reason: z.string().max(500),
      }),
    )
    .max(20),
});
export type AiSuggestions = z.infer<typeof suggestionSchema>;
export const aiInputSchema = z.object({
  post_id: z.uuid().optional(),
  kind: z.enum(aiKinds),
  text: z.string().trim().min(20).max(20000),
  category_ids: z.array(z.uuid()).max(20).default([]),
});
