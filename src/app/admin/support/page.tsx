import { requirePermission } from "@/lib/v4/permissions";
import { supportSchema, defaultSupport } from "@/lib/payments/schema";
import { SupportSettings } from "@/components/admin/v4/SupportSettings";
export default async function Page() {
  const { db } = await requirePermission("settings.manage");
  const [config, payments] = await Promise.all([
    db.from("site_settings").select("value").eq("key", "support").maybeSingle(),
    db
      .from("payments")
      .select("id,amount,status,paid_at")
      .order("paid_at", { ascending: false })
      .limit(100),
  ]);
  return (
    <>
      <h1>ಬೆಂಬಲ ಮತ್ತು ಸದಸ್ಯತ್ವ</h1>
      <SupportSettings
        initial={supportSchema
          .catch(defaultSupport)
          .parse(config.data?.value || defaultSupport)}
      />
      <h2>ಇತ್ತೀಚಿನ ಪಾವತಿಗಳು</h2>
      {payments.data?.map((p) => (
        <p key={p.id}>
          {p.id} · ₹{(p.amount / 100).toFixed(2)} · {p.status}
        </p>
      ))}
    </>
  );
}
