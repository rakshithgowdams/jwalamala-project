import { z } from "zod";
import type { NextRequest } from "next/server";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import {
  sameOrigin,
  privateJson,
  readJson,
  limitRequest,
} from "@/lib/v4/server";
import { supportConfig, razorpay } from "@/lib/payments/provider";
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  const session = await getServerClient(),
    db = getAdminClient();
  if (!session || !db) return privateJson({ error: "unavailable" }, 503);
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) return privateJson({ error: "login" }, 401);
  try {
    const { tier_id, request_id, accepted } = z
      .object({
        tier_id: z.string().max(50),
        request_id: z.uuid(),
        accepted: z.literal(true),
      })
      .parse(await readJson(request));
    if (!accepted) return privateJson({ error: "terms" }, 400);
    const config = await supportConfig(),
      tier = config.tiers.find((t) => t.id === tier_id);
    if (
      !config.enabled ||
      !tier ||
      !process.env.RAZORPAY_KEY_ID ||
      !process.env.RAZORPAY_KEY_SECRET ||
      !process.env.RAZORPAY_WEBHOOK_SECRET
    )
      return privateJson({ error: "unavailable" }, 503);
    if (!(await limitRequest("support:" + user.id, 10)))
      return privateJson({ error: "rate" }, 429);
    const { data: existing } = await db
      .from("support_checkouts")
      .select("*")
      .eq("id", request_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      if (existing.status === "ready" && existing.tier_id === tier_id)
        return privateJson({
          id: existing.id,
          key: process.env.RAZORPAY_KEY_ID,
          provider_id: existing.provider_id,
          kind: existing.kind,
          amount: existing.amount,
        });
      return privateJson({ error: "already_processing" }, 409);
    }
    if (tier.kind !== "once") {
      const plan = z
        .object({
          id: z.string(),
          period: z.string(),
          interval: z.number(),
          item: z.object({ amount: z.number(), currency: z.string() }),
        })
        .parse(await razorpay("plans/" + tier.plan_id));
      if (
        plan.id !== tier.plan_id ||
        plan.item.amount !== tier.amount ||
        plan.item.currency !== "INR" ||
        plan.period !== tier.kind ||
        plan.interval !== 1
      )
        return privateJson({ error: "plan_mismatch" }, 503);
    }
    const { error: insertError } = await db.from("support_checkouts").insert({
      id: request_id,
      user_id: user.id,
      tier_id: tier.id,
      kind: tier.kind,
      amount: tier.amount,
      ad_light: tier.ad_light,
    });
    if (insertError) return privateJson({ error: "existing_checkout" }, 409);
    const created = z
      .object({ id: z.string().regex(/^(order|sub)_[a-zA-Z0-9]+$/) })
      .parse(
        await razorpay(
          tier.kind === "once" ? "orders" : "subscriptions",
          tier.kind === "once"
            ? {
                amount: tier.amount,
                currency: "INR",
                receipt: request_id,
                notes: { checkout_id: request_id },
              }
            : {
                plan_id: tier.plan_id,
                total_count: tier.cycles,
                quantity: 1,
                customer_notify: 1,
                expire_by: Math.floor(Date.now() / 1000) + 86400,
                notes: { checkout_id: request_id },
              },
        ),
      );
    const { error: saveError } = await db
      .from("support_checkouts")
      .update({ provider_id: created.id, status: "ready" })
      .eq("id", request_id);
    if (saveError) throw saveError;
    return privateJson({
      id: request_id,
      key: process.env.RAZORPAY_KEY_ID,
      provider_id: created.id,
      kind: tier.kind,
      amount: tier.amount,
    });
  } catch {
    return privateJson({ error: "checkout_unavailable" }, 400);
  }
}
