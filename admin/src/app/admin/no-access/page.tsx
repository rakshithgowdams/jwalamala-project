import { requireStaff } from "@/lib/auth/require-user";
import { allSections, grantableKeys } from "@/lib/admin/sections";
import { NoAccessPanel } from "@/components/admin/NoAccessPanel";

/** Restricted desk page — keep the server work minimal so staff see it immediately. */
export default async function NoAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string; from?: string }>;
}) {
  const [{ section, from }, { profile }] = await Promise.all([searchParams, requireStaff()]);
  const key = (section || "").trim();
  const grantable = grantableKeys.includes(key);
  const label = allSections.find((s) => s.key === key)?.label || null;
  const held = new Set((profile.admin_sections as string[] | null) || []);
  const alreadyHas = grantable && held.has(key);
  const canRequest = profile.role === "staff" && grantable && !alreadyHas;
  const lockedFeatures =
    profile.role === "staff"
      ? grantableKeys
          .filter((k) => !held.has(k))
          .map((k) => {
            const meta = allSections.find((s) => s.key === k);
            return { key: k, label: meta?.label || { en: k, kn: k, hi: k } };
          })
      : [];

  return (
    <NoAccessPanel
      sectionKey={grantable ? key : ""}
      sectionLabel={label}
      fromPath={from || ""}
      alreadyHas={alreadyHas}
      canRequest={canRequest}
      lockedFeatures={lockedFeatures}
    />
  );
}
