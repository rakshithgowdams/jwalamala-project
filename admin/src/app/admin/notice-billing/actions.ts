"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
export async function saveNoticeBilling(input: unknown) {
  const p = z
    .object({
      notice_id: z.uuid(),
      amount: z.coerce.number().positive().max(1000000),
      payment_url: z.url().refine((v) => {
        const u = new URL(v);
        return (
          u.protocol === "https:" &&
          ["rzp.io", "pages.razorpay.com"].includes(u.hostname) &&
          !u.username &&
          !u.password
        );
      }),
      status: z.enum(["pending", "paid", "waived"]),
      payment_reference: z.string().max(200),
    })
    .safeParse(input);
  if (
    !p.success ||
    (p.data.status === "paid" && p.data.payment_reference.trim().length < 4)
  )
    return { error: "Check the amount, payment link and payment reference." };
  const { db, user } = await requirePermission("ads.manage");
  const { data: notice } = await db
    .from("notices")
    .select("status")
    .eq("id", p.data.notice_id)
    .single();
  if (!notice || (notice.status === "approved" && p.data.status === "pending"))
    return { error: "Use an unapproved notice for an unpaid invoice." };
  const { error } = await db.from("notice_billing").upsert({
    notice_id: p.data.notice_id,
    amount_paise: Math.round(p.data.amount * 100),
    payment_url: p.data.payment_url,
    status: p.data.status,
    payment_reference: p.data.payment_reference.trim(),
    reviewed_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save billing." };
  revalidatePath("/admin/notice-billing");
  return { ok: true };
}
