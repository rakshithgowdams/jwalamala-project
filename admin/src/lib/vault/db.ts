/** True when Supabase/PostgREST has not picked up the phone column yet. */
export function isMissingPhoneColumnError(message: string | null | undefined) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("phone") &&
    (text.includes("schema cache") ||
      text.includes("does not exist") ||
      text.includes("could not find") ||
      text.includes("column"))
  );
}

export const PHONE_COLUMN_SQL = `alter table public.admin_password_vault
  add column if not exists phone text not null default '';

alter table public.admin_password_vault_shares
  add column if not exists phone text not null default '';

notify pgrst, 'reload schema';`;

export const PHONE_COLUMN_HELP =
  "Phone is not available in the database yet. In Supabase SQL Editor run: alter table public.admin_password_vault add column if not exists phone text not null default ''; alter table public.admin_password_vault_shares add column if not exists phone text not null default ''; notify pgrst, 'reload schema';";

export const VAULT_LIST_SELECT =
  "id,title,site_url,email,phone,favicon_url,notes,created_at,updated_at";
export const VAULT_LIST_SELECT_LEGACY =
  "id,title,site_url,email,favicon_url,notes,created_at,updated_at";

/** Keep digits and common phone punctuation; empty string stays empty. */
export function normalizeVaultPhone(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/[^\d+()\s.-]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export function isValidVaultPhone(value: string) {
  if (!value) return true;
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 18;
}
