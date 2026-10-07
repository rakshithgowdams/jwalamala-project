import { z } from "zod";
export const storyStates = [
  "idea",
  "assigned",
  "draft",
  "review",
  "changes_requested",
  "approved",
  "scheduled",
  "published",
  "updated",
  "archived",
] as const;
export const assignmentSchema = z.object({
  id: z.uuid().optional(),
  title_kn: z.string().trim().min(3).max(200),
  assigned_to: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
  deadline_at: z
    .string()
    .refine((v) => !v || Number.isFinite(Date.parse(v)))
    .transform((v) =>
      v ? new Date(v.length === 16 ? v + "+05:30" : v).toISOString() : null,
    ),
  priority: z.coerce.number().int().min(1).max(3),
  notes: z.string().max(5000),
  post_id: z.union([z.uuid(), z.literal("")]).transform((v) => v || null),
});
export function publicationIssues(
  post: {
    title_kn: string;
    summary_kn: string;
    event_date: string;
    image_credit?: string;
    embargo_until?: string | null;
  },
  now = Date.now(),
) {
  const issues: string[] = [];
  if ([...post.title_kn].length > 110) issues.push("headline");
  if (!post.summary_kn.trim()) issues.push("summary");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(post.event_date)) issues.push("event_date");
  if (!post.image_credit?.trim()) issues.push("credit");
  if (post.embargo_until && Date.parse(post.embargo_until) > now)
    issues.push("embargo");
  return issues;
}
