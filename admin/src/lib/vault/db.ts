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

export const VAULT_LIST_SELECT =
  "id,title,site_url,email,phone,favicon_url,notes,created_at,updated_at";
export const VAULT_LIST_SELECT_LEGACY =
  "id,title,site_url,email,favicon_url,notes,created_at,updated_at";
