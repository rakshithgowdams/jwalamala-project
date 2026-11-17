import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { PasswordVaultBoard } from "@/components/admin/PasswordVaultBoard";
import type { VaultRow } from "./actions";

export const dynamic = "force-dynamic";

export default async function PasswordVaultPage() {
  const [{ profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  if (profile.role !== "admin") notFound();

  const server = getAdminClient() || db;
  const { data, error } = await server
    .from("admin_password_vault")
    .select("id,title,site_url,email,phone,favicon_url,notes,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Password vault", kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್", hi: "पासवर्ड वॉल्ट" })}</h1>
        </div>
        <p role="alert">
          {tr({
            en: "Password vault needs a database update. Run supabase/migrations/20261117100000_admin_password_vault.sql and 20261117120000_admin_password_vault_phone.sql in the Supabase SQL Editor, then reload.",
            kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್‌ಗೆ DB ಅಪ್‌ಡೇಟ್ ಬೇಕು. Supabase SQL Editor ನಲ್ಲಿ vault migrations ರನ್ ಮಾಡಿ.",
            hi: "पासवर्ड वॉल्ट के लिए DB अपडेट चाहिए। Supabase SQL Editor में vault migrations चलाएँ।",
          })}
        </p>
        <p role="status">{error.message}</p>
      </>
    );
  }

  const rows: VaultRow[] = (data || []).map((row) => ({
    id: row.id as string,
    title: (row.title as string) || "",
    siteUrl: (row.site_url as string) || "",
    email: (row.email as string) || "",
    phone: (row.phone as string) || "",
    faviconUrl: (row.favicon_url as string) || "",
    notes: (row.notes as string) || "",
    createdAt: (row.created_at as string) || "",
    updatedAt: (row.updated_at as string) || "",
  }));

  return <PasswordVaultBoard rows={rows} />;
}
