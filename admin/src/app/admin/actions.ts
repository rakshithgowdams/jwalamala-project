"use server";
import { chapterTextSchema } from "@/lib/v4/chapters";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { cleanHtml } from "@/lib/utils/sanitize";
import { isHostedImage } from "@/lib/utils/images";
import { normalizeVideo } from "@/lib/utils/video";
import { resourceSchemas, type Resource } from "@/lib/admin/resources";
import { kn } from "@/content/strings.kn";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  autoTranslatePost,
  autoTranslateRows,
  clearReviewedTranslations,
} from "@/lib/ai/autotranslate";
import { hasTranslatablePass } from "@/lib/ai/rows";
const translationColumns = [
  "title_en",
  "summary_en",
  "body_en",
  "title_hi",
  "summary_hi",
  "body_hi",
] as const;
const postSchema = z.object({
  key_points: chapterTextSchema,
  type: z.enum(["article", "video", "short"]).default("article"),
  early_access_until: z.string().optional(),
  audio_enabled: z.boolean().default(true),
  media_images: z
    .string()
    .transform((value, ctx) => {
      try {
        return JSON.parse(value);
      } catch {
        ctx.addIssue({ code: "custom", message: "Invalid images" });
        return z.NEVER;
      }
    })
    .pipe(
      z
        .array(
          z.object({
            url: z.string().trim().max(2000).refine(isHostedImage),
            credit: z.string().trim().min(1).max(200),
          }),
        )
        .max(3),
    ),
  thumbnail_url: z
    .string()
    .trim()
    .max(2000)
    .refine(
      (v) =>
        /^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/(?:hqdefault|maxresdefault)\.jpg$/.test(
          v,
        ) || isHostedImage(v),
    ),
  tag_ids: z.array(z.uuid()).max(20).default([]),
  public_author_id: z.union([z.uuid(), z.literal("")]).default(""),
  place_id: z.union([z.uuid(), z.literal("")]).default(""),
  event_id: z.union([z.uuid(), z.literal("")]).default(""),
  transcript: z.string().max(50000).default(""),
  seo_title: z.string().max(110).default(""),
  seo_description: z.string().max(300).default(""),
  sponsor_name: z.string().max(150).default(""),
  is_featured: z.boolean().default(false),
  is_breaking: z.boolean().default(false),
  is_live: z.boolean().default(false),
  allow_comments: z.boolean().default(false),
  breaking_until: z.string().optional(),
  id: z.uuid().optional(),
  title_kn: z.string().min(3).max(300),
  title_en: z.string().max(300),
  summary_en: z.string().max(1000).default(""),
  body_en: z.string().max(200000).default(""),
  title_hi: z.string().max(300).default(""),
  summary_hi: z.string().max(1000).default(""),
  body_hi: z.string().max(200000).default(""),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  summary_kn: z.string().max(1000),
  body_html: z.string().max(200000),
  body_json: z.string().max(200000),
  event_date: z.iso.date(),
  event_place: z.string().max(150),
  image_credit: z.string().trim().max(200),
  embargo_until: z.string().optional(),
  summary_points: z
    .string()
    .max(3000)
    .transform((v) =>
      v
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 5),
    ),
  hide_ads: z.boolean().default(false),
  meaningful_edit: z.boolean().default(false),
  status: z.enum(["draft", "published", "scheduled"]),
  scheduled_for: z.string().optional(),
  video_url: z.string().max(2000),
  primary_category: z.uuid(),
  category_ids: z.array(z.uuid()).min(1),
});
export async function savePost(input: unknown) {
  const { db, user } = await requireStaff();
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: kn.validation };
  const p = parsed.data;
  const { data: canEdit } = await db.rpc("has_permission", {
    requested: "content.edit",
  });
  const { data: canCreate } = await db.rpc("has_permission", {
    requested: "content.create",
  });
  const { data: canPublish } = await db.rpc("has_permission", {
    requested: "content.publish",
  });
  if (!canEdit && !canCreate) return { error: kn.validation };
  if (p.status !== "draft" && !canPublish) return { error: kn.validation };
  if (!canEdit && p.status !== "draft") return { error: kn.validation };
  if (
    p.status === "scheduled" &&
    (!p.scheduled_for ||
      new Date(
        p.scheduled_for.length === 16
          ? p.scheduled_for + "+05:30"
          : p.scheduled_for,
      ) <= new Date())
  )
    return { error: kn.validation };
  if (!p.category_ids.includes(p.primary_category))
    return { error: kn.validation };
  const video = p.video_url ? normalizeVideo(p.video_url) : null;
  if ((p.video_url && !video) || (p.type === "short" && !video))
    return { error: kn.validation };
  let body;
  try {
    body = JSON.parse(p.body_json);
  } catch {
    return { error: kn.validation };
  }
  // Read the stored translations before the write replaces them, so we can tell
  // which ones the editor actually changed.
  const { data: prior } = p.id
    ? await db
        .from("posts")
        .select(["machine_translated", ...translationColumns].join(","))
        .eq("id", p.id)
        .maybeSingle()
    : { data: null };
  const { data, error } = await db.rpc("save_editor_post", {
    payload: {
      ...p,
      early_access_until: p.early_access_until
        ? p.early_access_until.length === 16
          ? p.early_access_until + "+05:30"
          : p.early_access_until
        : null,
      embargo_until: p.embargo_until
        ? p.embargo_until.length === 16
          ? p.embargo_until + "+05:30"
          : p.embargo_until
        : null,
      scheduled_for: p.scheduled_for
        ? p.scheduled_for.length === 16
          ? p.scheduled_for + "+05:30"
          : p.scheduled_for
        : null,
      body_json: body,
      body_html: cleanHtml(p.body_html),
      body_en: cleanHtml(p.body_en),
      body_hi: cleanHtml(p.body_hi),
      author_id: user.id,
      video_provider: video?.provider || "none",
      video_id: video?.id || null,
      video_url: video?.url || null,
      thumbnail_url:
        video?.provider === "youtube" &&
        p.thumbnail_url === "/images/jwalamala-logo.jpg"
          ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`
          : p.thumbnail_url,
      breaking_until: p.breaking_until
        ? p.breaking_until.length === 16
          ? p.breaking_until + "+05:30"
          : p.breaking_until
        : null,
      type: video ? (p.type === "short" ? "short" : "video") : "article",
      title_translit: p.title_en.toLowerCase(),
    },
  });
  if (error) return { error: kn.unavailable };
  const id = String(data);
  if (prior)
    await clearReviewedTranslations(
      id,
      prior as unknown as Record<string, unknown>,
      p as unknown as Record<string, unknown>,
    );
  // Drafts are not worth spending translation budget on. Headline and summary are
  // short enough to finish before the editor sees the response, which keeps cards
  // and listings whole; the body follows once the response has been sent.
  if (p.status !== "draft") {
    await autoTranslatePost(id, "short");
    after(() => autoTranslatePost(id, "body"));
  }
  revalidatePath("/", "layout");
  return { id };
}
export async function saveResource(
  resource: Resource,
  id: string | null,
  input: unknown,
) {
  const { db } = await requireStaff();
  if (!Object.hasOwn(resourceSchemas, resource))
    return { error: kn.validation };
  const permission =
    resource === "users"
      ? "users.manage"
      : resource === "settings"
        ? "settings.manage"
        : resource === "ads"
          ? "ads.manage"
          : resource === "submissions"
            ? "community.manage"
            : "content.edit";
  const { data: allowed } = await db.rpc("has_permission", {
    requested: permission,
  });
  if (!allowed) return { error: kn.validation };
  const result = resourceSchemas[resource].safeParse(input);
  if (!result.success) return { error: kn.validation };
  let payload: Record<string, unknown> = { ...result.data };
  if (resource === "settings") {
    try {
      payload = { ...payload, value: JSON.parse(String(payload.value)) };
    } catch {
      return { error: kn.validation };
    }
  }
  const table =
    resource === "users"
      ? "profiles"
      : resource === "settings"
        ? "site_settings"
        : resource;
  if (!id && ["users", "submissions"].includes(resource))
    return { error: kn.validation };
  const query = id
    ? db
        .from(table)
        .update(payload)
        .eq(resource === "settings" ? "key" : "id", id)
    : db.from(table).insert(payload);
  // Categories, events and ads carry Kannada that the public site renders in three
  // languages, so their id is needed to translate them; the rest never are.
  const translates =
    hasTranslatablePass(table, "short") || hasTranslatablePass(table, "long");
  const { data, error } = translates ? await query.select("id") : await query;
  if (error) return { error: kn.unavailable };
  const saved = id || String(data?.[0]?.id || "");
  if (translates && saved) {
    await autoTranslateRows(table, [saved], "short");
    after(() => autoTranslateRows(table, [saved], "long"));
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
