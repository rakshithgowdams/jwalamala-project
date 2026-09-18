import { z } from "zod";
import type { Quiz } from "./types";
export const voteSchema = z
  .object({
    poll_id: z.uuid(),
    option_index: z.number().int().min(0).max(7).optional(),
    option_indexes: z
      .array(z.number().int().min(0).max(7))
      .min(1)
      .max(8)
      .refine((v) => new Set(v).size === v.length)
      .optional(),
  })
  .refine((v) => v.option_index !== undefined || !!v.option_indexes?.length);
export const reactionSchema = z.object({
  post_id: z.uuid(),
  kind: z.enum(["namana", "useful", "sad"]),
});
export function scoreQuiz(questions: Quiz["questions"], answers: number[]) {
  return questions.reduce(
    (score, q, index) => score + (q.answer === answers[index] ? 1 : 0),
    0,
  );
}
export function percentage(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

export function isPollClosed(
  poll: { status: string; ends_at: string },
  now = new Date(),
) {
  return poll.status === "closed" || Date.parse(poll.ends_at) <= now.getTime();
}
