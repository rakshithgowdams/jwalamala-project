"use server";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import {
  decryptVaultSecret,
  encryptVaultSecret,
  faviconForSite,
} from "@/lib/vault/crypto";

type Result = {
  ok?: true;
  error?: string;
  password?: string;
  id?: string;
  shareUrl?: string;
  expiresAt?: string;
};
type Fail = (en: string, kn: string, hi: string) => Result;

function isNextControlFlowError(error: unknown) {
  const digest =
    typeof error === "object" && error && "digest" in error
      ? String((error as { digest?: string }).digest || "")
      : "";
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_HTTP_ERROR_FALLBACK");
}

async function appOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return (
    process.env.NEXT_PUBLIC_ADMIN_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

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
  try {
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
        return fail(
          error.message || "Could not update the entry.",
          "ನಮೂದು ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
          "प्रविष्टि अपडेट नहीं हो सकी।",
        );
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
      return fail(
        error?.message || "Could not save the entry.",
        "ನಮೂದು ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        "प्रविष्टि सहेजी नहीं जा सकी।",
      );
    touch();
    return { ok: true, id: data.id as string };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}

/** Reveal one decrypted password (admin only; never logged). */
export async function revealVaultPassword(input: unknown): Promise<Result> {
  try {
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
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}

/** Delete a vault entry (admin only). */
export async function deleteVaultEntry(input: unknown): Promise<Result> {
  try {
    const access = await gate();
    if ("denied" in access) return access.denied;
    const { server, fail } = access;
    const parsed = z.object({ id: z.uuid() }).safeParse(input);
    if (!parsed.success) return fail("Invalid entry.", "ಅಮಾನ್ಯ ನಮೂದು.", "अमान्य प्रविष्टि।");

    const { error } = await server.from("admin_password_vault").delete().eq("id", parsed.data.id);
    if (error)
      return fail(
        error.message || "Could not delete the entry.",
        "ನಮೂದು ಅಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        "प्रविष्टि हटाई नहीं जा सकी।",
      );
    touch();
    return { ok: true };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}

const shareSchema = z.object({
  id: z.uuid(),
  /** Hours until the share link expires (1–168). Default 24. */
  hours: z.coerce.number().int().min(1).max(168).default(24),
});

/**
 * Create a time-limited share link for one vault entry (admin only).
 * The link snapshots the encrypted password; recipients open /vault-share/[token].
 */
export async function createVaultShareLink(input: unknown): Promise<Result> {
  try {
    const access = await gate();
    if ("denied" in access) return access.denied;
    const { server, user, fail } = access;
    const parsed = shareSchema.safeParse(input);
    if (!parsed.success) return fail("Invalid entry.", "ಅಮಾನ್ಯ ನಮೂದು.", "अमान्य प्रविष्टि।");

    const { data: row, error } = await server
      .from("admin_password_vault")
      .select("id,title,site_url,email,password_encrypted,favicon_url,notes")
      .eq("id", parsed.data.id)
      .maybeSingle();
    if (error || !row)
      return fail("Entry not found.", "ನಮೂದು ಸಿಗಲಿಲ್ಲ.", "प्रविष्टि नहीं मिली।");

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000).toISOString();
    const { error: insertError } = await server.from("admin_password_vault_shares").insert({
      vault_id: row.id,
      token,
      title: row.title || "",
      site_url: row.site_url,
      email: row.email || "",
      password_encrypted: row.password_encrypted,
      favicon_url: row.favicon_url || "",
      notes: row.notes || "",
      created_by: user.id,
      expires_at: expiresAt,
    });
    if (insertError)
      return fail(
        insertError.message || "Could not create the share link.",
        "ಹಂಚಿಕೆ ಲಿಂಕ್ ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
        "शेयर लिंक नहीं बन सका।",
      );

    const origin = await appOrigin();
    return {
      ok: true,
      shareUrl: `${origin}/vault-share/${token}`,
      expiresAt,
    };
  } catch (error) {
    if (isNextControlFlowError(error)) throw error;
    return {
      error: error instanceof Error ? error.message : "Something went wrong. Please try again.",
    };
  }
}

export type SharedVaultView = {
  title: string;
  siteUrl: string;
  email: string;
  password: string;
  faviconUrl: string;
  notes: string;
  expiresAt: string;
};

/** Load a public share by token (no login). Marks a view. */
export async function loadVaultShare(token: string): Promise<
  | { ok: true; data: SharedVaultView }
  | { ok: false; error: string }
> {
  const clean = String(token || "").trim();
  if (!/^[a-f0-9]{32,128}$/i.test(clean))
    return { ok: false, error: "Invalid share link." };

  const server = getAdminClient();
  if (!server) return { ok: false, error: "Service unavailable." };

  const { data, error } = await server
    .from("admin_password_vault_shares")
    .select(
      "id,title,site_url,email,password_encrypted,favicon_url,notes,expires_at,revoked_at,view_count",
    )
    .eq("token", clean)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Share link not found." };
  if (data.revoked_at) return { ok: false, error: "This share link was revoked." };
  if (new Date(data.expires_at as string).getTime() <= Date.now())
    return { ok: false, error: "This share link has expired." };

  let password: string;
  try {
    password = decryptVaultSecret(data.password_encrypted as string);
  } catch {
    return { ok: false, error: "Could not decrypt shared password." };
  }

  await server
    .from("admin_password_vault_shares")
    .update({
      view_count: Number(data.view_count || 0) + 1,
      last_viewed_at: new Date().toISOString(),
    })
    .eq("id", data.id as string);

  return {
    ok: true,
    data: {
      title: (data.title as string) || "",
      siteUrl: (data.site_url as string) || "",
      email: (data.email as string) || "",
      password,
      faviconUrl: (data.favicon_url as string) || "",
      notes: (data.notes as string) || "",
      expiresAt: (data.expires_at as string) || "",
    },
  };
}
