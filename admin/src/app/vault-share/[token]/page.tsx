import { CopyShareFields } from "@/components/admin/VaultShareView";
import { loadVaultShare } from "@/app/admin/password-vault/actions";

export default async function VaultSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const result = await loadVaultShare(token);

  if (!result.ok) {
    return (
      <main className="vault-share-page">
        <div className="vault-share-card">
          <h1>Share link unavailable</h1>
          <p role="alert">{result.error}</p>
        </div>
      </main>
    );
  }

  const row = result.data;
  const expiresLabel = new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  }).format(new Date(row.expiresAt));

  return (
    <main className="vault-share-page">
      <div className="vault-share-card">
        <div className="vault-share-head">
          {row.faviconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={row.faviconUrl} alt="" width={40} height={40} />
          ) : null}
          <div>
            <h1>{row.title || row.siteUrl}</h1>
            <p>Shared login · expires {expiresLabel} IST</p>
          </div>
        </div>
        <CopyShareFields
          siteUrl={row.siteUrl}
          email={row.email}
          phone={row.phone}
          password={row.password}
          notes={row.notes}
        />
      </div>
    </main>
  );
}
