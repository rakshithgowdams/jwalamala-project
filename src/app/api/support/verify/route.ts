import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { readJson, sameOrigin, privateJson } from "@/lib/v4/server";
import { razorpay, recordCaptured } from "@/lib/payments/provider";
import {
  verifyPaymentSignature,
  checkoutMessage,
} from "@/lib/payments/signatures";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  try {
    const p = z
      .object({
        checkout_id: z.uuid(),
        razorpay_payment_id: z.string().regex(/^pay_[a-zA-Z0-9]+$/),
        razorpay_signature: z.string().max(100),
      })
      .parse(await readJson(request));
    const session = await getServerClient(),
      db = getAdminClient();
    if (!session || !db) return privateJson({ error: "unavailable" }, 503);
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) return privateJson({ error: "unauthorized" }, 401);
    const { data: c } = await db
      .from("support_checkouts")
      .select("*")
      .eq("id", p.checkout_id)
      .eq("user_id", user.id)
      .single();
    if (
      !c?.provider_id ||
      !verifyPaymentSignature(
        checkoutMessage(
          c.provider_id,
          p.razorpay_payment_id,
          c.kind !== "once",
        ),
        p.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET || "",
      )
    )
      return privateJson({ error: "invalid_signature" }, 400);
    if (c.kind !== "once")
      return privateJson({ status: "awaiting_recurring_charge" });
    const raw = await razorpay("payments/" + p.razorpay_payment_id);
    return privateJson({
      status: (await recordCaptured(c.provider_id, raw))
        ? "captured"
        : "pending",
    });
  } catch {
    return privateJson({ error: "verification_failed" }, 400);
  }
}
