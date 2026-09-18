import { z } from "zod";
export const tierSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,50}$/),
  name: z.string().min(1).max(100),
  amount: z.number().int().min(100).max(10000000),
  kind: z.enum(["once", "monthly", "yearly"]),
  plan_id: z
    .string()
    .regex(/^plan_[a-zA-Z0-9]+$|^$/)
    .default(""),
  cycles: z.number().int().min(1).max(120).default(12),
  benefits: z.array(z.string().max(200)).max(6),
  ad_light: z.boolean().default(false),
});
export const supportSchema = z
  .object({
    enabled: z.boolean(),
    legal_name: z.string().max(200),
    contact_email: z.union([z.email(), z.literal("")]),
    terms_path: z
      .string()
      .regex(/^\/(?![\/\\]).*/)
      .default("/support/terms"),
    terms: z.string().max(20000),
    refund_policy: z.string().max(10000),
    tiers: z.array(tierSchema).max(8),
  })
  .refine((v) => new Set(v.tiers.map((t) => t.id)).size === v.tiers.length)
  .refine(
    (v) =>
      !v.enabled ||
      (v.legal_name.trim().length > 2 &&
        v.contact_email &&
        v.terms.trim().length > 30 &&
        v.refund_policy.trim().length > 30 &&
        v.tiers.length > 0 &&
        v.tiers.every((t) => t.kind === "once" || t.plan_id)),
  );
export type SupportConfig = z.infer<typeof supportSchema>;
export const defaultSupport: SupportConfig = {
  enabled: false,
  legal_name: "",
  contact_email: "",
  terms_path: "/support/terms",
  terms: "",
  refund_policy: "",
  tiers: [],
};
