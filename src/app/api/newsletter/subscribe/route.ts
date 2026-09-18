import { unsubscribeToken } from "@/lib/providers/newsletter";
import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sameOrigin,
  readJson,
  privateJson,
  checkCaptcha,
  requestIdentity,
  limitRequest,
  digest,
} from "@/lib/v4/server";
import { sendEmail } from "@/lib/providers/email";
import { site } from "@/config/site";
import { v4 as t } from "@/content/strings.kn";
const schema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.trim().toLowerCase()),
  frequency: z.enum(["daily", "weekly"]),
  token: z.string().min(1).max(2048),
});
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "origin" }, 403);
  try {
    const parsed = schema.safeParse(await readJson(request));
    if (!parsed.success) return privateJson({ error: "validation" }, 400);
    const identity = await requestIdentity(request),
      db = getAdminClient();
    if (!identity || !db || !process.env.RESEND_API_KEY)
      return privateJson({ error: "unavailable" }, 503);
    if (
      !(await limitRequest("newsletter:" + identity.ipHash, 5)) ||
      !(await limitRequest("newsletter-email:" + digest(parsed.data.email), 2))
    )
      return privateJson({ error: "rate" }, 429);
    if (!(await checkCaptcha(parsed.data.token, request.nextUrl.hostname)))
      return privateJson({ error: "captcha" }, 400);
    const { data: existing } = await db
      .from("newsletter_subscribers")
      .select("id,status")
      .eq("email", parsed.data.email)
      .maybeSingle();
    // Same response for existing active subscribers prevents account enumeration.
    if (existing?.status === "active") return privateJson({ ok: true });
    const confirm = randomBytes(32).toString("hex"),
      id = existing?.id || randomUUID();
    const { error } = await db.from("newsletter_subscribers").upsert({
      id,
      email: parsed.data.email,
      status: "pending",
      token_hash: digest(confirm),
      token_expires_at: new Date(Date.now() + 86400000).toISOString(),
      unsubscribe_hash: digest(unsubscribeToken(id)),
      preferences: { frequency: parsed.data.frequency },
    });
    if (error) throw error;
    const link = new URL("/newsletter/confirm", site.url);
    link.searchParams.set("token", confirm);
    await sendEmail(
      parsed.data.email,
      t.confirmNewsletter,
      "<p>" +
        t.newsletterHint +
        '</p><p><a href="' +
        link.href +
        '">' +
        t.confirmNewsletter +
        "</a></p>",
      "confirm-" + digest(confirm),
    );
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "unavailable" }, 503);
  }
}
