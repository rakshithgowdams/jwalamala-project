"use server";
import { chapterTextSchema } from "@/lib/v4/chapters";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { cleanHtml } from "@/lib/utils/sanitize";
import { coverImageUrl, isCoverImage, isHostedImage } from "@/lib/utils/images";
import { videoFromInput } from "@/lib/utils/video";
import { slugify, transliterateKannada } from "@/lib/utils/slug";
import { isoToday } from "@/lib/utils/dates";
import { site } from "@/config/site";
import { databaseError, issueError, postErrors, type PostError } from "@/lib/admin/post-errors";
import { resourceSchemas, type Resource } from "@/lib/admin/resources";
import { getUiStrings } from "@/lib/i18n/server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  autoTranslatePost,
  autoTranslateRows,
  clearReviewedTranslations,
} from "@/lib/ai/autotranslate";
import { hasTranslatablePass } from "@/lib/ai/rows";
import { getAdminClient } from "@/lib/supabase/admin";
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
    .transform((v) => coverImageUrl(v) || v)
    .refine(isCoverImage),
  tag_ids: z.array(z.uuid()).max(20).default([]),
  public_author_id: z.union([z.uuid(), z.literal("")]).default(""),
  place_id: z.union([z.uuid(), z.literal("")]).default(""),
  event_id: z.union([z.uuid(), z.literal("")]).default(""),
  transcript: z.string().max(50000).default(""),
  seo_title: z.string().max(110).default(""),
  seo_description: z.string().max(300).default(""),
  seo_keywords: z.string().max(500).default(""),
  sponsor_name: z.string().max(150).default(""),
  is_featured: z.boolean().default(false),
  is_breaking: z.boolean().default(false),
  is_live: z.boolean().default(false),
  allow_comments: z.boolean().default(false),
  breaking_until: z.string().optional(),
  id: z.uuid().optional(),
  title_kn: z.string().min(3).max(300),
  title_en: z.string().max(300).default(""),
  summary_en: z.string().max(1000).default(""),
  body_en: z.string().max(200000).default(""),
  title_hi: z.string().max(300).default(""),
  summary_hi: z.string().max(1000).default(""),
  body_hi: z.string().max(200000).default(""),
  slug: z.string().max(150).regex(/^[a-z0-9-]*$/).default(""),
  summary_kn: z.string().max(1000).default(""),
  body_html: z.string().max(200000),
  body_json: z.string().max(200000),
  event_date: z.union([z.iso.date(), z.literal("")]).default(""),
  event_place: z.string().max(150).default(""),
  image_credit: z.string().trim().max(200).default(""),
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
  video_url: z.string().max(5000).default(""),
  primary_category: z.uuid(),
  category_ids: z.array(z.uuid()).max(30).default([]),
});
/** First ~220 characters of the article text, cut at a word. */
function excerpt(html: string) {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= 220) return text;
  return text.slice(0, 220).replace(/\s+\S*$/, "") + "…";
}

/** Slugs are unique across posts; a clash gets -2, -3 and so on. */
async function uniqueSlug(
  db: Awaited<ReturnType<typeof requireStaff>>["db"],
  base: string,
  id?: string,
) {
  const { data } = await db.from("posts").select("id,slug").like("slug", base + "%").limit(200);
  const taken = new Set((data || []).filter((row) => row.id !== id).map((row) => row.slug));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export async function savePost(input: unknown): Promise<{ id?: string; error?: string; field?: string }> {
  const [{ db, user }, { kn, tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail = (problem: PostError | null) =>
    problem ? { error: tr(problem.message), field: problem.field } : { error: kn.validation };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) {
    console.error("[posts] invalid fields:", parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.code}`).join(", "));
    return fail(issueError(parsed.error.issues[0]));
  }
  const p = parsed.data;
  const [{ data: canEdit }, { data: canCreate }, { data: canPublish }] = await Promise.all(
    ["content.edit", "content.create", "content.publish"].map((requested) =>
      db.rpc("has_permission", { requested }),
    ),
  );
  if (!canEdit && !canCreate) return fail(postErrors.noEditPermission);
  if (p.status !== "draft" && (!canPublish || !canEdit)) return fail(postErrors.noPublishPermission);
  if (
    p.status === "scheduled" &&
    (!p.scheduled_for ||
      new Date(
        p.scheduled_for.length === 16
          ? p.scheduled_for + "+05:30"
          : p.scheduled_for,
      ) <= new Date())
  )
    return fail(postErrors.scheduleInPast);
  const publishing = p.status !== "draft";
  if (publishing && p.title_kn.trim().length > 110) return fail(postErrors.titleTooLong);
  const video = p.video_url.trim() ? videoFromInput(p.video_url) : null;
  if (p.video_url.trim() && !video) return fail(postErrors.badVideo);
  if (p.type === "short" && !video) return fail(postErrors.shortNeedsVideo);
  const text = excerpt(p.body_html);
  if (publishing && !text && !video) return fail(postErrors.bodyRequired);
  // Editors write only the Kannada article; everything below is derived so a
  // story can be published with a title, a category and a body.
  const summary = p.summary_kn.trim() || text || p.title_kn.trim();
  const eventDate = p.event_date || isoToday();
  const categoryIds = [...new Set([p.primary_category, ...p.category_ids])];
  const type = video && (p.type === "video" || p.type === "short") ? p.type : "article";
  let body;
  try {
    body = JSON.parse(p.body_json);
  } catch {
    return fail({ field: "body_html", message: postErrors.bodyRequired.message });
  }
  // The stored translations are read before the write replaces them, so we can
  // tell which ones the editor actually changed.
  const [slug, { data: prior }] = await Promise.all([
    uniqueSlug(db, p.slug || slugify(p.title_kn) || "article", p.id),
    p.id
      ? db
          .from("posts")
          .select(["machine_translated", ...translationColumns].join(","))
          .eq("id", p.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const { data, error } = await db.rpc("save_editor_post", {
    payload: {
      ...p,
      slug,
      summary_kn: summary,
      event_date: eventDate,
      image_credit: p.image_credit || site.fullName,
      category_ids: categoryIds,
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
      type,
      title_translit: transliterateKannada(p.title_kn).toLowerCase(),
    },
  });
  if (error) {
    console.error("[posts] save failed:", error.code, error.message);
    const problem = databaseError(error);
    return problem ? fail(problem) : { error: kn.unavailable };
  }
  const id = String(data);
  const [{ error: keywordError }] = await Promise.all([
    // A new article without keywords has nothing to store or clear.
    p.id || p.seo_keywords.trim()
      ? db
          .from("posts")
          .update({ seo_keywords: p.seo_keywords.trim() || null })
          .eq("id", id)
      : Promise.resolve({ error: null }),
    prior &&
      clearReviewedTranslations(
        id,
        prior as unknown as Record<string, unknown>,
        p as unknown as Record<string, unknown>,
      ),
  ]);
  if (keywordError) console.error("[posts] SEO keywords not saved:", keywordError.message);
  // Translation calls the AI provider and takes seconds, so it runs after the
  // response: the article is live in Kannada at once and the English and Hindi
  // versions appear when ready. Drafts are not worth the translation budget.
  if (publishing)
    after(async () => {
      await autoTranslatePost(id, "short");
      await autoTranslatePost(id, "body");
    });
  // Only the pages that list articles; refreshing the whole layout would make
  // this response re-render the editor the admin is looking at.
  revalidatePath("/admin/posts");
  revalidatePath("/admin");
  return { id };
}

/** Records that keep their own history but point at an article; deleting it unlinks them. */
const postLinks = [
  ["submissions", "converted_post_id"],
  ["import_rows", "post_id"],
  ["polls", "post_id"],
  ["story_assignments", "post_id"],
  ["ai_suggestions", "post_id"],
  ["social_posts", "post_id"],
] as const;

function adminOnly(
  profile: { role?: string },
  tr: (text: { en: string; kn: string; hi: string }) => string,
  kn: { validation: string },
) {
  if (profile.role === "admin") return null;
  return {
    error: tr({
      en: "Only administrators can delete articles.",
      kn: "ಲೇಖನ ಅಳಿಸಲು ನಿರ್ವಾಹಕರಿಗೆ ಮಾತ್ರ ಅನುಮತಿ.",
      hi: "केवल व्यवस्थापक लेख हटा सकते हैं।",
    }) as string,
  };
}

/**
 * The recycle bin is the Archived status: the article leaves the site at once and
 * stays in the database until an administrator deletes it from the bin.
 */
export async function trashPost(postId: unknown): Promise<{ ok?: true; error?: string }> {
  const [{ db, profile }, { kn, tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { error: kn.validation };
  const denied = adminOnly(profile, tr, kn);
  if (denied) return denied;
  const { data, error } = await db
    .from("posts")
    .update({ status: "archived", is_featured: false, is_breaking: false })
    .eq("id", id.data)
    .neq("status", "archived")
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[posts] recycle failed:", error.code, error.message);
    if (error?.message.includes("locked"))
      return {
        error: tr({
          en: "Another editor has this article open. Try again in a few minutes.",
          kn: "ಈ ಲೇಖನವನ್ನು ಇನ್ನೊಬ್ಬ ಸಂಪಾದಕರು ತೆರೆದಿದ್ದಾರೆ. ಕೆಲವು ನಿಮಿಷಗಳ ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
          hi: "यह लेख कोई और संपादक खोले हुए है। कुछ मिनट बाद फिर कोशिश करें।",
        }),
      };
    return { error: kn.unavailable };
  }
  revalidatePath("/admin/posts");
  revalidatePath("/admin/posts/bin");
  return { ok: true };
}

/** Puts a recycled article back on the article list as a draft, ready to republish. */
export async function restorePost(postId: unknown): Promise<{ ok?: true; error?: string }> {
  const [{ db, profile }, { kn, tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { error: kn.validation };
  const denied = adminOnly(profile, tr, kn);
  if (denied) return denied;
  const { data, error } = await db
    .from("posts")
    .update({ status: "draft" })
    .eq("id", id.data)
    .eq("status", "archived")
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("[posts] restore failed:", error.code, error.message);
    return { error: kn.unavailable };
  }
  revalidatePath("/admin/posts");
  revalidatePath("/admin/posts/bin");
  return { ok: true };
}

/** Permanently deletes an article that is already in the recycle bin. */
export async function deletePost(postId: unknown): Promise<{ ok?: true; error?: string }> {
  const [{ db, profile }, { kn, tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const id = z.uuid().safeParse(postId);
  if (!id.success) return { error: kn.validation };
  const denied = adminOnly(profile, tr, kn);
  if (denied) return denied;
  const { data: held } = await db.from("posts").select("id,status").eq("id", id.data).maybeSingle();
  if (held?.status !== "archived")
    return {
      error: tr({
        en: "Move the article to the recycle bin before deleting it permanently.",
        kn: "ಶಾಶ್ವತವಾಗಿ ಅಳಿಸುವ ಮೊದಲು ಲೇಖನವನ್ನು ಮರುಬಳಕೆ ಡಬ್ಬಿಗೆ ಸೇರಿಸಿ.",
        hi: "स्थायी रूप से हटाने से पहले लेख को रीसायकल बिन में भेजें।",
      }),
    };
  // These references have no ON DELETE rule and RLS hides most of them from the
  // editor's session, so the service client clears them after the role check above.
  const admin = getAdminClient();
  if (admin) {
    const results = await Promise.all([
      ...postLinks.map(([table, column]) =>
        admin.from(table).update({ [column]: null }).eq(column, id.data),
      ),
      admin.from("push_campaigns").delete().eq("post_id", id.data),
    ]);
    for (const { error } of results)
      if (error) console.error("[posts] unlinking before delete:", error.message);
  }
  // The delete itself runs as the admin, so the audit log records who removed it.
  const { data, error } = await db.from("posts").delete().eq("id", id.data).select("id");
  if (error || !data?.length) {
    if (error) console.error("[posts] delete failed:", error.code, error.message);
    return { error: kn.unavailable };
  }
  revalidatePath("/admin/posts");
  revalidatePath("/admin/posts/bin");
  revalidatePath("/admin");
  return { ok: true };
}
export async function saveResource(
  resource: Resource,
  id: string | null,
  input: unknown,
) {
  const { db } = await requireStaff();
  const { kn } = await getUiStrings();
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
