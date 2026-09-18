import "server-only";
import { createHmac } from "node:crypto";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "./email";
import { site } from "@/config/site";
import { digest } from "@/lib/v4/server";
import { v4 as t } from "@/content/strings.kn";
export function unsubscribeToken(id: string) {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) throw Error("Newsletter signing key required");
  return createHmac("sha256", secret)
    .update("unsubscribe:" + id)
    .digest("hex");
}
export async function sendNewsletterDelivery(deliveryId: string) {
  const db = getAdminClient();
  if (!db) throw Error("Service unavailable");
  const { data: delivery } = await db
    .from("newsletter_deliveries")
    .select(
      "*,newsletter_issues(subject,html,status),newsletter_subscribers(id,email,status)",
    )
    .eq("id", deliveryId)
    .single();
  if (!delivery || delivery.status === "sent" || delivery.status === "skipped")
    return;
  const issue = delivery.newsletter_issues,
    subscriber = delivery.newsletter_subscribers;
  if (subscriber?.status !== "active" || issue?.status !== "queued") {
    await db
      .from("newsletter_deliveries")
      .update({ status: "skipped" })
      .eq("id", deliveryId);
    return;
  }
  const token = unsubscribeToken(subscriber.id),
    link = new URL("/newsletter/unsubscribe", site.url),
    oneClick = new URL("/api/newsletter/unsubscribe", site.url);
  link.searchParams.set("token", token);
  oneClick.searchParams.set("token", token);
  await db
    .from("newsletter_subscribers")
    .update({ unsubscribe_hash: digest(token) })
    .eq("id", subscriber.id);
  const result = await sendEmail(
    subscriber.email,
    issue.subject,
    issue.html + '<p><a href="' + link.href + '">' + t.unsubscribe + "</a></p>",
    "newsletter-" + deliveryId,
    oneClick.href,
  );
  const { error } = await db
    .from("newsletter_deliveries")
    .update({
      status: "sent",
      provider_id: result.id,
      sent_at: new Date().toISOString(),
    })
    .eq("id", deliveryId);
  if (error) throw Error("Delivery state unknown; review before retry");
}
