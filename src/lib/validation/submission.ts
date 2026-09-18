import { z } from "zod";
export const submissionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{10,16}$/),
  email: z.email().or(z.literal("")).optional(),
  town: z.string().trim().min(2).max(100),
  event_date: z.iso.date(),
  link: z
    .url()
    .refine((v) => v.startsWith("https://"))
    .or(z.literal("")),
  message: z.string().trim().min(20).max(5000),
  token: z.string().min(1),
});
export type SubmissionInput = z.infer<typeof submissionSchema>;
