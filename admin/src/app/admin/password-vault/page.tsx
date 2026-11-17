import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { PasswordVaultBoard } from "@/components/admin/PasswordVaultBoard";
import {
  isMissingPhoneColumnError,
  PHONE_COLUMN_SQL,
  VAULT_LIST_SELECT,
  VAULT_LIST_SELECT_LEGACY,
} from "@/lib/vault/db";
import type { VaultRow } from "./actions";

export const dynamic = "force-dynamic";

export default async function PasswordVaultPage() {
  const [{ profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  if (profile.role !== "admin") notFound();

  const server = getAdminClient() || db;
  let phoneSupported = true;
  let { data, error } = await server
    .from("admin_password_vault")
    .select(VAULT_LIST_SELECT)
    .order("created_at", { ascending: false })
    .limit(500);

  // Older DBs / stale PostgREST cache may not expose `phone` yet.
  if (error && isMissingPhoneColumnError(error.message)) {
    phoneSupported = false;
    const fallback = await server
      .from("admin_password_vault")
      .select(VAULT_LIST_SELECT_LEGACY)
      .order("created_at", { ascending: false })
      .limit(500);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    const missingTable =
      /admin_password_vault/i.test(error.message) &&
      /(schema cache|does not exist|could not find)/i.test(error.message);
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Password vault", kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್", hi: "पासवर्ड वॉल्ट" })}</h1>
        </div>
        <p role="alert">
          {missingTable
            ? tr({
                en: "Password vault table is missing. Run supabase/migrations/20261117100000_admin_password_vault.sql in the Supabase SQL Editor, then reload.",
                kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್ ಟೇಬಲ್ ಇಲ್ಲ. Supabase SQL Editor ನಲ್ಲಿ 20261117100000_admin_password_vault.sql ರನ್ ಮಾಡಿ.",
                hi: "पासवर्ड वॉल्ट टेबल नहीं है। Supabase SQL Editor में 20261117100000_admin_password_vault.sql चलाएँ।",
              })
            : tr({
                en: "Could not load the password vault.",
                kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
                hi: "पासवर्ड वॉल्ट लोड नहीं हो सका।",
              })}
        </p>
        <p role="status">{error.message}</p>
      </>
    );
  }

  const rows: VaultRow[] = (data || []).map((row) => {
    const phoneValue =
      phoneSupported && row && typeof row === "object" && "phone" in row
        ? String((row as { phone?: string | null }).phone ?? "")
        : "";
    return {
      id: row.id as string,
      title: (row.title as string) || "",
      siteUrl: (row.site_url as string) || "",
      email: (row.email as string) || "",
      phone: phoneValue,
      faviconUrl: (row.favicon_url as string) || "",
      notes: (row.notes as string) || "",
      createdAt: (row.created_at as string) || "",
      updatedAt: (row.updated_at as string) || "",
    };
  });

  return (
    <PasswordVaultBoard
      rows={rows}
      phoneSupported={phoneSupported}
      phoneSetupSql={phoneSupported ? "" : PHONE_COLUMN_SQL}
    />
  );
}
