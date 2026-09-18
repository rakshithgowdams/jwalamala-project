import { z } from "zod";
import { getServerClient } from "@/lib/supabase/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { readJson, sameOrigin, privateJson } from "@/lib/v4/server";
import { razorpay } from "@/lib/payments/provider";
export async function POST(request: Request) {
  if (!sameOrigin(request)) return privateJson({ error: "forbidden" }, 403);
  try {
    const { id } = z.object({ id: z.uuid() }).parse(await readJson(request));
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
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (!c || c.kind === "once" || !c.provider_id)
      return privateJson({ error: "invalid" }, 400);
    if (c.status === "cancelled" || c.cancel_at_end)
      return privateJson({ ok: true });
    const current = z
      .object({
        status: z.string(),
        current_end: z.number().nullable().optional(),
      })
      .parse(await razorpay("subscriptions/" + c.provider_id));
    if (!["cancelled", "completed", "expired"].includes(current.status))
      await razorpay("subscriptions/" + c.provider_id + "/cancel", {
        cancel_at_cycle_end: false,
      });
    const { error } = await db
      .from("support_checkouts")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (error) throw error;
    return privateJson({ ok: true });
  } catch {
    return privateJson({ error: "cancel_failed" }, 400);
  }
}
