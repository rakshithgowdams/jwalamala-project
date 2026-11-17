import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/** 32-byte AES key derived from the first available vault secret. */
function vaultKey() {
  const secret =
    process.env.VAULT_ENCRYPTION_KEY ||
    process.env.SOCIAL_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  if (!secret.trim()) {
    throw new Error("Vault encryption key missing");
  }
  // Accept either a 64-char hex key or any long secret — always hash to 32 bytes.
  const hex = secret.trim();
  if (/^[0-9a-fA-F]{64}$/.test(hex)) return Buffer.from(hex, "hex");
  return createHash("sha256").update(hex, "utf8").digest();
}

/** Encrypt a password for storage. Format: iv.tag.ciphertext (base64). */
export function encryptVaultSecret(plain: string) {
  const key = vaultKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((part) => part.toString("base64")).join(".");
}

/** Decrypt a vault password ciphertext. */
export function decryptVaultSecret(value: string) {
  const key = vaultKey();
  const parts = value.split(".");
  if (parts.length !== 3) throw new Error("Invalid vault ciphertext");
  const [iv, tag, body] = parts.map((part) => Buffer.from(part, "base64"));
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString("utf8");
}

/** Favicon URL for a site (Google s2 service). */
export function faviconForSite(siteUrl: string) {
  try {
    const host = new URL(siteUrl).hostname;
    if (!host) return "";
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return "";
  }
}
