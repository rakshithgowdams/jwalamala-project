"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/v4/permissions";
import { getUiStrings } from "@/lib/i18n/server";
export async function saveNoticeBilling(input: unknown) {
  const { tr } = await getUiStrings();
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
    return {
      error: tr({
        en: "Check the amount, payment link and payment reference.",
        kn: "ಮೊತ್ತ, ಪಾವತಿ ಲಿಂಕ್ ಮತ್ತು ಪಾವತಿ ಉಲ್ಲೇಖವನ್ನು ಪರಿಶೀಲಿಸಿ.",
        hi: "राशि, भुगतान लिंक और भुगतान संदर्भ जाँचें।",
      }),
    };
  const { db, user } = await requirePermission("ads.manage");
  const { data: notice } = await db
    .from("notices")
    .select("status")
    .eq("id", p.data.notice_id)
    .single();
  if (!notice || (notice.status === "approved" && p.data.status === "pending"))
    return {
      error: tr({
        en: "Use an unapproved notice for an unpaid invoice.",
        kn: "ಪಾವತಿಯಾಗದ ಬಿಲ್‌ಗೆ ಅನುಮೋದನೆಯಾಗದ ಪ್ರಕಟಣೆಯನ್ನು ಬಳಸಿ.",
        hi: "बिना भुगतान वाले बिल के लिए ऐसी सूचना चुनें जो अभी अनुमोदित नहीं हुई है।",
      }),
    };
  const { error } = await db.from("notice_billing").upsert({
    notice_id: p.data.notice_id,
    amount_paise: Math.round(p.data.amount * 100),
    payment_url: p.data.payment_url,
    status: p.data.status,
    payment_reference: p.data.payment_reference.trim(),
    reviewed_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error)
    return {
      error: tr({
        en: "Could not save billing.",
        kn: "ಬಿಲ್ಲಿಂಗ್ ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
        hi: "बिलिंग सहेजी नहीं जा सकी।",
      }),
    };
  revalidatePath("/admin/notice-billing");
  return { ok: true };
}
