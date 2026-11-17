"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import {
  decryptVaultSecret,
  encryptVaultSecret,
  faviconForSite,
} from "@/lib/vault/crypto";

type Result = { ok?: true; error?: string; password?: string; id?: string };
type Fail = (en: string, kn: string, hi: string) => Result;

async function gate() {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  if (profile.role !== "admin")
    return {
      denied: fail(
        "Only administrators can use the password vault.",
        "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್ ನಿರ್ವಾಹಕರಿಗೆ ಮಾತ್ರ.",
        "पासवर्ड वॉल्ट केवल एडमिन के लिए है।",
      ) as Result,
    };
  const server = getAdminClient();
  if (!server)
    return {
      denied: fail(
        "Password vault needs the server key in admin/.env.local.",
        "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್‌ಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.",
        "पासवर्ड वॉल्ट के लिए admin/.env.local में सर्वर कुंजी चाहिए।",
      ) as Result,
    };
  return { server, user, fail };
}

function touch() {
  revalidatePath("/admin/password-vault");
}

const urlSchema = z
  .string()
  .trim()
  .min(8)
  .max(2000)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Invalid URL");

const saveSchema = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().max(160).default(""),
  siteUrl: urlSchema,
  email: z.string().trim().max(320).default(""),
  password: z.string().min(1).max(500),
  notes: z.string().trim().max(1000).default(""),
});

export type VaultRow = {
  id: string;
  title: string;
  siteUrl: string;
  email: string;
  faviconUrl: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

/** Create or update an encrypted credential (admin only). */
export async function saveVaultEntry(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail } = access;
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Enter a valid site link, email, and password.",
      "ಮಾನ್ಯ ಸೈಟ್ ಲಿಂಕ್, ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ನಮೂದಿಸಿ.",
      "मान्य साइट लिंक, ईमेल और पासवर्ड दर्ज करें।",
    );

  let passwordEncrypted: string;
  try {
    passwordEncrypted = encryptVaultSecret(parsed.data.password);
  } catch {
    return fail(
      "Vault encryption is not configured on the server.",
      "ಸರ್ವರ್‌ನಲ್ಲಿ ವಾಲ್ಟ್ ಎನ್‌ಕ್ರಿಪ್ಷನ್ ಸಿದ್ಧವಿಲ್ಲ.",
      "सर्वर पर वॉल्ट एन्क्रिप्शन सेट नहीं है।",
    );
  }

  const now = new Date().toISOString();
  const faviconUrl = faviconForSite(parsed.data.siteUrl);
  const title =
    parsed.data.title ||
    (() => {
      try {
        return new URL(parsed.data.siteUrl).hostname;
      } catch {
        return "Site";
      }
    })();

  if (parsed.data.id) {
    const { error } = await server
      .from("admin_password_vault")
      .update({
        title,
        site_url: parsed.data.siteUrl,
        email: parsed.data.email,
        password_encrypted: passwordEncrypted,
        favicon_url: faviconUrl,
        notes: parsed.data.notes,
        updated_by: user.id,
        updated_at: now,
      })
      .eq("id", parsed.data.id);
    if (error)
      return fail(error.message || "Could not update the entry.", "ನಮೂದು ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "प्रविष्टि अपडेट नहीं हो सकी।");
    touch();
    return { ok: true, id: parsed.data.id };
  }

  const { data, error } = await server
    .from("admin_password_vault")
    .insert({
      title,
      site_url: parsed.data.siteUrl,
      email: parsed.data.email,
      password_encrypted: passwordEncrypted,
      favicon_url: faviconUrl,
      notes: parsed.data.notes,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data)
    return fail(error?.message || "Could not save the entry.", "ನಮೂದು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "प्रविष्टि सहेजी नहीं जा सकी।");
  touch();
  return { ok: true, id: data.id as string };
}

/** Reveal one decrypted password (admin only; never logged). */
export async function revealVaultPassword(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid entry.", "ಅಮಾನ್ಯ ನಮೂದು.", "अमान्य प्रविष्टि।");

  const { data, error } = await server
    .from("admin_password_vault")
    .select("password_encrypted")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (error || !data)
    return fail("Entry not found.", "ನಮೂದು ಸಿಗಲಿಲ್ಲ.", "प्रविष्टि नहीं मिली।");

  try {
    return { ok: true, password: decryptVaultSecret(data.password_encrypted as string) };
  } catch {
    return fail(
      "Could not decrypt this password. Check the vault encryption key.",
      "ಪಾಸ್‌ವರ್ಡ್ ಡೀಕ್ರಿಪ್ಟ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ವಾಲ್ಟ್ ಕೀ ಪರಿಶೀಲಿಸಿ.",
      "पासवर्ड डिक्रिप्ट नहीं हो सका। वॉल्ट कुंजी जांचें।",
    );
  }
}

/** Delete a vault entry (admin only). */
export async function deleteVaultEntry(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return fail("Invalid entry.", "ಅಮಾನ್ಯ ನಮೂದು.", "अमान्य प्रविष्टि।");

  const { error } = await server.from("admin_password_vault").delete().eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not delete the entry.", "ನಮೂದು ಅಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "प्रविष्टि हटाई नहीं जा सकी।");
  touch();
  return { ok: true };
}
