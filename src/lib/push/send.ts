import "server-only";
import webpush from "web-push";
import { getAdminClient } from "@/lib/supabase/admin";
import { reserveBudget, providerOptions } from "@/lib/providers/budget";
import { safePushEndpoint } from "./schema";
export async function sendPushDelivery(id: string): Promise<string | null> {
  const db = getAdminClient(),
    publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    privateKey = process.env.VAPID_PRIVATE_KEY,
    subject = process.env.VAPID_SUBJECT;
  if (
    !db ||
    !publicKey ||
    !privateKey ||
    !subject ||
    !(await providerOptions("push"))
  )
    throw Error("Push unavailable");
  const { data: d } = await db
    .from("push_deliveries")
    .select("*,push_campaigns(*),push_subscriptions(*)")
    .eq("id", id)
    .single();
  if (!d || d.status !== "pending") return null;
  const campaign = d.push_campaigns,
    subscription = d.push_subscriptions;
  let targetUrl = "",
    imageUrl: string | undefined;
  if (campaign.post_id) {
    const { data: post } = await db
      .from("posts")
      .select(
        "slug,type,thumbnail_url,status,published_at,embargo_until,early_access_until",
      )
      .eq("id", campaign.post_id)
      .single();
    if (
      !post ||
      post.status !== "published" ||
      Date.parse(post.published_at) > Date.now() ||
      (post.embargo_until && Date.parse(post.embargo_until) > Date.now()) ||
      !subscription ||
      !safePushEndpoint(subscription.endpoint)
    ) {
      await db
        .from("push_deliveries")
        .update({ status: "skipped" })
        .eq("id", id);
      return null;
    }
    if (
      post.early_access_until &&
      Date.parse(post.early_access_until) > Date.now()
    )
      return post.early_access_until;
    targetUrl =
      "/" + (post.type === "video" ? "video" : "news") + "/" + post.slug;
    imageUrl = post.thumbnail_url;
  } else {
    const events = campaign.topic === "events";
    const { data: source } = await db
      .from(events ? "events" : "jain_calendar_days")
      .select(events ? "id,start_date,is_seed" : "id,date,is_seed")
      .eq("id", campaign.source_id)
      .maybeSingle();
    const { data: reminder } = await db
      .from(events ? "event_reminders" : "calendar_reminders")
      .select("user_id")
      .eq("user_id", d.user_id)
      .eq(events ? "event_id" : "day_id", campaign.source_id)
      .limit(1);
    const day = new Date().toLocaleDateString("en-CA", {
      timeZone: "Asia/Kolkata",
    });
    const date =
      source && ("start_date" in source ? source.start_date : source.date);
    if (
      !source ||
      source.is_seed ||
      !date ||
      date < day ||
      !reminder?.length ||
      !subscription ||
      !safePushEndpoint(subscription.endpoint)
    ) {
      await db
        .from("push_deliveries")
        .update({ status: "skipped" })
        .eq("id", id);
      return null;
    }
    targetUrl = campaign.target_path;
  }
  const { data: reservation, error } = await db.rpc("reserve_push_delivery", {
    target: id,
  });
  if (error) throw error;
  if (reservation === "quiet")
    return new Date(Date.now() + 3600000).toISOString();
  if (reservation !== "ready") return null;
  try {
    await reserveBudget("push", 1);
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title: campaign.title,
        body: campaign.body,
        url: targetUrl,
        image: imageUrl,
        click_token: d.click_token,
        tag: campaign.id,
      }),
      {
        vapidDetails: { subject, publicKey, privateKey },
        TTL: 3600,
        timeout: 10000,
        urgency: campaign.topic === "breaking" ? "high" : "normal",
        topic: campaign.id.replaceAll("-", "").slice(0, 32),
      },
    );
    const { error: saveError } = await db
      .from("push_deliveries")
      .update({ status: "sent" })
      .eq("id", id);
    if (saveError) throw saveError;
  } catch (error) {
    await db.from("push_deliveries").update({ status: "failed" }).eq("id", id);
    if (
      error &&
      typeof error === "object" &&
      "statusCode" in error &&
      [404, 410].includes(Number(error.statusCode))
    )
      await db.from("push_subscriptions").delete().eq("id", subscription.id);
    throw Error("Push delivery failed; review before retry");
  }
  return null;
}
