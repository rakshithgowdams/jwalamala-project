import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { privateJson } from "@/lib/v4/server";
import { verifyPaymentSignature } from "@/lib/payments/signatures";
import { recordCaptured, paymentEntity } from "@/lib/payments/provider";
export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return privateJson({ error: "unavailable" }, 503);
  try {
    const reader = request.body?.getReader();
    if (!reader) return privateJson({ error: "invalid" }, 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 128000) {
        await reader.cancel();
        return privateJson({ error: "too_large" }, 413);
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks);
    if (
      !verifyPaymentSignature(
        raw,
        request.headers.get("x-razorpay-signature") || "",
        secret,
      )
    )
      return privateJson({ error: "signature" }, 400);
    const event = z
      .object({
        event: z.string(),
        payload: z.record(
          z.string(),
          z.object({ entity: z.record(z.string(), z.unknown()) }),
        ),
      })
      .parse(JSON.parse(raw.toString("utf8")));
    const db = getAdminClient();
    if (!db) return privateJson({ error: "unavailable" }, 503);
    const payment = event.payload.payment?.entity,
      sub = event.payload.subscription?.entity;
    if (event.event === "payment.captured" && payment) {
      const p = paymentEntity.parse(payment);
      if (p.order_id) await recordCaptured(p.order_id, p);
    } else if (event.event === "subscription.charged" && payment && sub) {
      const s = z
        .object({
          id: z.string().regex(/^sub_[a-zA-Z0-9]+$/),
          current_end: z.number().int().positive(),
        })
        .parse(sub);
      await recordCaptured(s.id, payment, s.current_end);
    } else if (
      ["subscription.cancelled", "subscription.completed"].includes(
        event.event,
      ) &&
      sub
    ) {
      const id = z
        .string()
        .regex(/^sub_[a-zA-Z0-9]+$/)
        .parse(sub.id);
      const { error } = await db
        .from("support_checkouts")
        .update({ status: "cancelled" })
        .eq("provider_id", id);
      if (error) throw error;
    } else if (event.event === "payment.refunded" && payment) {
      const p = paymentEntity.parse(payment);
      if (p.amount_refunded >= p.amount) {
        const { error } = await db.rpc("refund_support_payment", {
          payment: p.id,
        });
        if (error) throw error;
      }
    }
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "retry" }, 503);
  }
}
