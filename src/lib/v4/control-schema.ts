import { z } from "zod";
export const providerIds = [
  "weather",
  "tts",
  "ai",
  "email",
  "social",
  "push",
] as const;
export const permissions = [
  "admin.access",
  "content.read",
  "content.create",
  "content.edit",
  "content.publish",
  "community.manage",
  "newsletter.manage",
  "social.manage",
  "analytics.read",
  "ads.manage",
  "settings.manage",
  "users.manage",
] as const;
export const roles = [
  "editor_in_chief",
  "editor",
  "sub_editor",
  "reporter",
  "contributor",
  "ad_manager",
  "moderator",
  "analyst",
  "reader",
] as const;
export const providerControlSchema = z.object({
  id: z.enum(providerIds),
  enabled: z.boolean(),
  monthly_limit: z.coerce.number().min(0).max(1e9),
  blocked_category_ids: z.array(z.uuid()).max(100).default([]),
});
export const roleControlSchema = z.object({
  role: z.enum(roles),
  permission: z.enum(permissions),
  allowed: z.boolean(),
});
