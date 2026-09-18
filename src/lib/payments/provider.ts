import "server-only";
import { z } from "zod";
import { getSetting } from "@/lib/v4/settings";
import { supportSchema, defaultSupport } from "./schema";
import { getAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/providers/email";
export async function supportConfig() {
  return supportSchema
    .catch(defaultSupport)
    .parse((await getSetting("support")) || defaultSupport);
}
export async function razorpay(path: string, body?: unknown): Promise<unknown> {
  const id = process.env.RAZORPAY_KEY_ID,
    secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw Error("Payments unavailable");
  const response = await fetch("https://api.razorpay.com/v1/" + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      Authorization:
        "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw Error("Payment provider unavailable");
  return response.json();
}
export const paymentEntity = z.object({
  id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
  order_id: z.string().nullable().optional(),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
  amount_refunded: z.number().int().default(0),
  created_at: z.number().int(),
});
export async function recordCaptured(
  providerId: string,
  raw: unknown,
  end?: number,
) {
  const payment = paymentEntity.parse(raw);
  if (
    payment.status !== "captured" ||
    payment.currency !== "INR" ||
    payment.amount_refunded > 0
  )
    return false;
  const db = getAdminClient();
  if (!db) throw Error("Unavailable");
  const { data: checkout, error } = await db
    .from("support_checkouts")
    .select("*")
    .eq("provider_id", providerId)
    .maybeSingle();
  if (error) throw error;
  if (!checkout) return false;
  if (checkout.amount !== payment.amount) throw Error("Amount mismatch");
  if (checkout.kind === "once" && payment.order_id !== providerId)
    throw Error("Order mismatch");
  const { error: saveError } = await db.rpc("record_support_payment", {
    checkout: checkout.id,
    payment: payment.id,
    amount_paid: payment.amount,
    paid_time: new Date(payment.created_at * 1000).toISOString(),
    period_end: end ? new Date(end * 1000).toISOString() : null,
  });
  if (saveError) throw saveError;
  return true;
}
export async function sendSupportReceipt(paymentId: string) {
  const db = getAdminClient();
  if (!db) throw Error();
  const { data: p } = await db
    .from("payments")
    .select("*")
    .eq("id", paymentId)
    .single();
  if (!p || p.receipt_sent_at || p.status !== "captured") return;
  const {
    data: { user },
  } = await db.auth.admin.getUserById(p.user_id);
  if (!user?.email) throw Error("Email missing");
  await sendEmail(
    user.email,
    "ನಿಮ್ಮ ಬೆಂಬಲಕ್ಕೆ ಧನ್ಯವಾದಗಳು",
    "<h1>ಪಾವತಿ ಸ್ವೀಕೃತಿ</h1><p>₹" +
      (p.amount / 100).toFixed(2) +
      "</p><p>Razorpay: " +
      p.id +
      "</p><p>ಇದು ಪಾವತಿ ಸ್ವೀಕೃತಿ. ತೆರಿಗೆ ಕಡಿತದ ಪ್ರಮಾಣಪತ್ರವಲ್ಲ.</p>",
    "support-receipt-" + p.id,
  );
  const { error } = await db
    .from("payments")
    .update({ receipt_sent_at: new Date().toISOString() })
    .eq("id", p.id);
  if (error) throw error;
}
