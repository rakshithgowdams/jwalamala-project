import Link from "next/link";
import { supportConfig } from "@/lib/payments/provider";
import { SupportCheckout } from "@/components/engagement/SupportCheckout";
import { getUiStrings } from "@/lib/i18n/server";
import { brandName } from "@/lib/i18n/content";
export async function generateMetadata() {
  const { kn, locale } = await getUiStrings();
  return { title: kn.supportBrand.replace("{brand}", brandName(locale)) };
}
export default async function Page() {
  const { kn, locale } = await getUiStrings();
  const config = await supportConfig();
  const available =
    config.enabled &&
    !!process.env.RAZORPAY_KEY_ID &&
    !!process.env.RAZORPAY_KEY_SECRET &&
    !!process.env.RAZORPAY_WEBHOOK_SECRET;
  return (
    <div className="container page-shell">
      <h1>{kn.supportBrand.replace("{brand}", brandName(locale))}</h1>
      <p>{kn.supportIntro}</p>
      {available ? (
        <>
          <p>
            {kn.payee}: {config.legal_name}
          </p>
          <SupportCheckout config={config} />
          <Link href="/account/support">{kn.mySupportAndPayments}</Link>
        </>
      ) : (
        <p className="notice">
          {kn.supportPaymentsNotLive}{" "}
          <Link href="/contact">{kn.contactUs}</Link>.
        </p>
      )}
    </div>
  );
}
