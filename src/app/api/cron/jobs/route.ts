import { buildScheduledDrafts } from "@/lib/distribution/schedule";
import { sendSupportReceipt } from "@/lib/payments/provider";
import { sendPushDelivery } from "@/lib/push/send";
import { timingSafeEqual } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { generateArticleAudio } from "@/lib/audio/generate";
import { sendNewsletterDelivery } from "@/lib/providers/newsletter";
import { publishSocial } from "@/lib/providers/social";
import { privateJson } from "@/lib/v4/server";
export const maxDuration = 300;
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET,
    value = request.headers.get("authorization") || "";
  if (
    !secret ||
    Buffer.byteLength(value) !== Buffer.byteLength("Bearer " + secret) ||
    !timingSafeEqual(Buffer.from(value), Buffer.from("Bearer " + secret))
  )
    return privateJson({ error: "unauthorized" }, 401);
  const db = getAdminClient();
  if (!db) return privateJson({ error: "unavailable" }, 503);
  await buildScheduledDrafts();
  await db.rpc("expire_stalled_jobs");
  await db.rpc("queue_due_reminders");
  const { data: jobs, error } = await db.rpc("claim_v4_jobs", {
    batch_size: 1,
  });
  if (error) return privateJson({ error: "unavailable" }, 503);
  let completed = 0,
    failed = 0;
  for (const job of jobs || []) {
    try {
      if (job.kind === "push-delivery") {
        const defer = await sendPushDelivery(job.payload.delivery_id);
        if (defer) {
          await db
            .from("automation_jobs")
            .update({
              status: "pending",
              run_after: defer,
              attempts: job.attempts - 1,
            })
            .eq("id", job.id);
          continue;
        }
      } else if (job.kind === "support-receipt")
        await sendSupportReceipt(job.payload.payment_id);
      else if (job.kind === "article-audio") {
        const { data: post } = await db
          .from("posts")
          .select("early_access_until,embargo_until")
          .eq("id", job.payload.post_id)
          .maybeSingle();
        const release = Math.max(
          Date.parse(post?.early_access_until || "") || 0,
          Date.parse(post?.embargo_until || "") || 0,
        );
        if (release > Date.now()) {
          await db
            .from("automation_jobs")
            .update({
              status: "pending",
              run_after: new Date(release).toISOString(),
              attempts: job.attempts - 1,
            })
            .eq("id", job.id);
          continue;
        }
        await generateArticleAudio(job.payload.post_id);
      } else if (job.kind === "newsletter-delivery")
        await sendNewsletterDelivery(job.payload.delivery_id);
      else if (job.kind === "social-publish")
        await publishSocial(job.payload.social_id);
      else throw Error("Unknown job type");
      const { error } = await db
        .from("automation_jobs")
        .update({ status: "done", last_error: null })
        .eq("id", job.id);
      if (error) throw error;
      completed++;
    } catch {
      failed++;
      const retry =
        !["social-publish", "push-delivery"].includes(job.kind) &&
        job.attempts < 3 &&
        Date.now() - Date.parse(job.created_at) < 20 * 3600000;
      await db
        .from("automation_jobs")
        .update({
          status: retry ? "pending" : "failed",
          run_after: new Date(Date.now() + job.attempts * 60000).toISOString(),
          last_error:
            "Service failed or disabled. Review external delivery before retry.",
        })
        .eq("id", job.id);
      if (!retry && job.kind === "newsletter-delivery")
        await db
          .from("newsletter_deliveries")
          .update({ status: "failed" })
          .eq("id", job.payload.delivery_id);
      if (job.kind === "social-publish")
        await db
          .from("social_posts")
          .update({
            status: "failed",
            error: "Delivery may be uncertain; check channel before retry.",
          })
          .eq("id", job.payload.social_id);
    }
  }
  await db.rpc("finalize_v4_newsletters");
  await db.rpc("publish_scheduled_posts");
  await db.rpc("cleanup_v4_ephemeral");
  return privateJson({ completed, failed }, failed ? 207 : 200);
}
