"use server";
import { cleanHtml } from "@/lib/utils/sanitize";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { getPosts, getEvents } from "@/lib/queries/content";
import { bulletin, newsletterHtml } from "@/lib/distribution/format";
import { getAdminClient } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/providers/social";
import { v4 as t } from "@/content/strings.kn";
export async function makeDistributionDraft(input: unknown) {
  const parsed = z
    .object({
      kind: z.enum(["newsletter", "telegram", "facebook", "whatsapp"]),
      ids: z.array(z.uuid()).min(1).max(15),
      note: z.string().max(2000),
      subject: z.string().min(1).max(200),
    })
    .safeParse(input);
  if (!parsed.success) return { error: t.failed };
  const p = parsed.data,
    { db } = await requirePermission(
      p.kind === "newsletter" ? "newsletter.manage" : "social.manage",
    );
  const posts = (await getPosts()).filter(
    (post) => p.ids.includes(post.id) && !post.is_seed,
  );
  if (posts.length !== p.ids.length) return { error: t.failed };
  const caption = bulletin(posts, p.note);
  if (p.kind === "whatsapp") return { text: caption };
  if (p.kind === "newsletter") {
    const events = (await getEvents())
      .filter(
        (e) =>
          !e.is_seed && e.end_date >= new Date().toISOString().slice(0, 10),
      )
      .slice(0, 5);
    const { error } = await db.from("newsletter_issues").insert({
      subject: p.subject,
      html: newsletterHtml(posts, events, p.note),
      status: "draft",
    });
    if (error) return { error: t.failed };
  } else {
    if (caption.length > 4000) return { error: t.captionTooLong };
    const { error } = await db.from("social_posts").insert({
      network: p.kind,
      caption,
      status: "draft",
      post_id: posts[0].id,
    });
    if (error) return { error: t.failed };
  }
  revalidatePath(
    "/admin/" + (p.kind === "newsletter" ? "newsletter" : "social"),
  );
  return { ok: true };
}
export async function queueDistribution(
  kind: "newsletter" | "social",
  id: string,
) {
  await requirePermission(
    kind === "newsletter" ? "newsletter.manage" : "social.manage",
  );
  if (!z.uuid().safeParse(id).success) return { error: t.failed };
  const db = getAdminClient();
  if (!db) return { error: t.failed };
  const { error } = await db.rpc("queue_v4_distribution", {
    kind,
    item_id: id,
  });
  if (error) return { error: t.failed };
  revalidatePath("/admin/" + kind);
  return { ok: true };
}
export async function connectSocial(input: unknown) {
  await requirePermission("settings.manage");
  const parsed = z
    .object({
      network: z.enum(["telegram", "facebook"]),
      page_id: z.string().regex(/^[@a-zA-Z0-9_-]{1,150}$/),
      token: z.string().min(20).max(2000),
      enabled: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: t.failed };
  try {
    const db = getAdminClient();
    if (!db) return { error: t.failed };
    const { error } = await db.from("social_accounts").upsert(
      {
        network: parsed.data.network,
        page_id: parsed.data.page_id,
        token_encrypted: encryptToken(parsed.data.token),
        status: parsed.data.enabled ? "active" : "disabled",
      },
      { onConflict: "network" },
    );
    return error ? { error: t.failed } : { ok: true };
  } catch {
    return { error: t.failed };
  }
}

export async function editDistributionDraft(input: unknown) {
  const p = z
    .object({
      kind: z.enum(["newsletter", "social"]),
      id: z.uuid(),
      subject: z.string().max(200),
      content: z.string().min(1).max(50000),
    })
    .safeParse(input);
  if (!p.success) return { error: t.failed };
  const { db } = await requirePermission(
    p.data.kind === "newsletter" ? "newsletter.manage" : "social.manage",
  );
  if (p.data.kind === "social" && p.data.content.length > 4000)
    return { error: t.captionTooLong };
  const update =
    p.data.kind === "newsletter"
      ? { subject: p.data.subject, html: cleanHtml(p.data.content) }
      : { caption: p.data.content };
  const { data, error } = await db
    .from(p.data.kind === "newsletter" ? "newsletter_issues" : "social_posts")
    .update(update)
    .eq("id", p.data.id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length) return { error: t.failed };
  revalidatePath("/admin/" + p.data.kind);
  return { ok: true };
}
