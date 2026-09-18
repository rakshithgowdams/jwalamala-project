"use client";
import Script from "next/script";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { SupportConfig } from "@/lib/payments/schema";
import { site } from "@/config/site";
type CheckoutReply = {
  razorpay_payment_id: string;
  razorpay_signature: string;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, callback: () => void) => void;
    };
  }
}
export function SupportCheckout({ config }: { config: SupportConfig }) {
  const { kn } = useUiStrings();
  const [ready, setReady] = useState(false),
    [accepted, setAccepted] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function checkout(tier: string) {
    if (!accepted || !window.Razorpay) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/support/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier_id: tier,
          request_id: crypto.randomUUID(),
          accepted,
        }),
      });
      if (response.status === 401) {
        router.push("/login?next=/support");
        return;
      }
      if (!response.ok) throw Error();
      const c = await response.json();
      const payment = new window.Razorpay({
        key: c.key,
        ...(c.kind === "once"
          ? { order_id: c.provider_id, amount: c.amount, currency: "INR" }
          : { subscription_id: c.provider_id }),
        name: config.legal_name,
        description: config.tiers.find((t) => t.id === tier)?.name,
        image: site.logo,
        theme: { color: "#C8341E" },
        modal: { ondismiss: () => setBusy(false) },
        handler: async (result: CheckoutReply) => {
          try {
            const verified = await fetch("/api/support/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ checkout_id: c.id, ...result }),
            });
            if (!verified.ok) throw Error();
            const status = await verified.json();
            setMessage(
              status.status === "captured"
                ? kn.paymentConfirmed
                : kn.paymentPending,
            );
          } catch {
            setMessage(kn.paymentVerifyPending);
          } finally {
            setBusy(false);
          }
        },
      });
      payment.on("payment.failed", () => {
        setBusy(false);
        setMessage(kn.paymentFailed);
      });
      payment.open();
    } catch {
      setMessage(kn.paymentStartFailed);
      setBusy(false);
    }
  }
  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => setReady(true)}
        onError={() => setMessage(kn.paymentServiceUnavailable)}
      />
      <label className="chip">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>
          <Link href={config.terms_path}>{kn.termsAndRefund}</Link>{" "}
          {kn.agreeToTerms}
        </span>
      </label>
      <div className="community-grid">
        {config.tiers.map((t) => (
          <section className="utility-panel" key={t.id}>
            <h2>{t.name}</h2>
            <p className="price">
              ₹{(t.amount / 100).toLocaleString("en-IN")}{" "}
              {t.kind === "once"
                ? kn.oneTime
                : t.kind === "monthly"
                  ? kn.perMonth
                  : kn.perYear}
            </p>
            {t.kind !== "once" && (
              <p>
                {t.cycles} {kn.billingCyclesNote}
              </p>
            )}
            <ul>
              {t.benefits.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <button
              className="button button-ember"
              disabled={!ready || !accepted || busy}
              onClick={() => void checkout(t.id)}
            >
              {kn.supportNow}
            </button>
          </section>
        ))}
      </div>
      <p role="status">{message}</p>
    </>
  );
}
