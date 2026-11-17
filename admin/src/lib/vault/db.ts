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

const PHONE_NOTE_PREFIX = "☎ ";

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

/** Strip any embedded phone marker from notes text. */
export function stripPhoneFromNotes(notes: string) {
  return String(notes || "")
    .split(/\r?\n/)
    .filter((line) => !line.startsWith(PHONE_NOTE_PREFIX))
    .join("\n")
    .trim();
}

/** Read phone from column value, or from a ☎ line inside notes. */
export function readVaultPhone(phoneColumn: unknown, notes: unknown) {
  const fromColumn = normalizeVaultPhone(phoneColumn);
  if (fromColumn) return { phone: fromColumn, notes: stripPhoneFromNotes(String(notes || "")) };

  const rawNotes = String(notes || "");
  const line = rawNotes.split(/\r?\n/).find((entry) => entry.startsWith(PHONE_NOTE_PREFIX));
  if (!line) return { phone: "", notes: rawNotes.trim() };
  return {
    phone: normalizeVaultPhone(line.slice(PHONE_NOTE_PREFIX.length)),
    notes: stripPhoneFromNotes(rawNotes),
  };
}

/**
 * Prefer the dedicated phone column. If that column is unavailable, keep the
 * number inside notes with a ☎ marker so save/edit/share still work.
 */
export function writeVaultPhoneFields(phone: string, notes: string, phoneColumnAvailable: boolean) {
  const cleanPhone = normalizeVaultPhone(phone);
  const cleanNotes = stripPhoneFromNotes(notes);
  if (phoneColumnAvailable) {
    return { phone: cleanPhone, notes: cleanNotes };
  }
  if (!cleanPhone) return { notes: cleanNotes };
  return {
    notes: `${PHONE_NOTE_PREFIX}${cleanPhone}${cleanNotes ? `\n${cleanNotes}` : ""}`,
  };
}
