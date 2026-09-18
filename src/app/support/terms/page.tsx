import { supportConfig } from "@/lib/payments/provider";
import { getUiStrings } from "@/lib/i18n/server";
export default async function Page() {
  const { kn } = await getUiStrings();
  const config = await supportConfig();
  return (
    <div className="container page-shell prose">
      <h1>{kn.supportTerms}</h1>
      {config.terms ? (
        <>
          <h2>{config.legal_name}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{config.terms}</p>
          <h2>{kn.refundPolicy}</h2>
          <p style={{ whiteSpace: "pre-wrap" }}>{config.refund_policy}</p>
          <p>
            {kn.contactLabel}: {config.contact_email}
          </p>
        </>
      ) : (
        <p>{kn.supportTermsPending}</p>
      )}
    </div>
  );
}
