import "server-only";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { getListing } from "@/lib/queries/listing";
import { bulletin, newsletterHtml } from "./format";
import { site } from "@/config/site";
export const scheduleSchema = z.object({
  enabled: z.boolean(),
  hours: z.array(z.number().int().min(0).max(23)).min(1).max(4),
  networks: z
    .array(z.enum(["newsletter", "telegram", "facebook"]))
    .min(1)
    .max(3),
});
export async function buildScheduledDrafts() {
  const db = getAdminClient();
  if (!db || site.demo) return;
  const { data: setting } = await db
    .from("site_settings")
    .select("value")
    .eq("key", "distribution_schedule")
    .maybeSingle();
  const parsed = scheduleSchema.safeParse(setting?.value);
  if (!parsed.success || !parsed.data.enabled) return;
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(now),
    hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    );
  const slot = [...parsed.data.hours]
    .sort((a, b) => b - a)
    .find((h) => h <= hour);
  if (slot === undefined) return;
  const posts = (await getListing({}, "1", 8)).rows.filter(
    (p) => !p.is_seed && Date.now() - Date.parse(p.published_at) < 48 * 3600000,
  );
  if (!posts.length) return;
  const key = date + ":" + slot,
    subject =
      "ಜ್ವಾಲಾಮಾಲಾ · " +
      date +
      " · " +
      String(slot).padStart(2, "0") +
      ":00 IST";
  const socialPosts = [...posts];
  while (bulletin(socialPosts, subject).length > 4000 && socialPosts.length > 1)
    socialPosts.pop();
  const socialCaption = bulletin(socialPosts, subject);
  for (const network of new Set(parsed.data.networks)) {
    if (network === "newsletter") {
      const { error } = await db.from("newsletter_issues").upsert(
        {
          schedule_key: key,
          subject,
          html: newsletterHtml(posts, [], ""),
          status: "draft",
        },
        { onConflict: "schedule_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    } else {
      const { error } = await db.from("social_posts").upsert(
        {
          schedule_key: key + ":" + network,
          network,
          post_id: posts[0].id,
          caption: socialCaption,
          status: "draft",
        },
        { onConflict: "schedule_key", ignoreDuplicates: true },
      );
      if (error) throw error;
    }
  }
}
