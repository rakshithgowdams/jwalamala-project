import "server-only";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { reserveBudget } from "./budget";
import { getAdminClient } from "@/lib/supabase/admin";
export function encryptToken(token: string) {
  const key = Buffer.from(process.env.SOCIAL_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw Error("Social encryption key missing");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv),
    body = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), body]
    .map((b) => b.toString("base64"))
    .join(".");
}
export function decryptToken(value: string) {
  const key = Buffer.from(process.env.SOCIAL_ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw Error("Social encryption key missing");
  const [iv, tag, body] = value.split(".").map((v) => Buffer.from(v, "base64")),
    decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString(
    "utf8",
  );
}
export async function publishSocial(id: string) {
  const db = getAdminClient();
  if (!db) throw Error("Service unavailable");
  const { data: post } = await db
    .from("social_posts")
    .select("*")
    .eq("id", id)
    .eq("status", "queued")
    .single();
  if (!post) return;
  const { data: account } = await db
    .from("social_accounts")
    .select("*")
    .eq("network", post.network)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (!account) throw Error("Social account not configured");
  const token = decryptToken(account.token_encrypted);
  await reserveBudget("social", 1);
  let url: string | null = null;
  if (post.network === "telegram") {
    const response = await fetch(
      "https://api.telegram.org/bot" + token + "/sendMessage",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: account.page_id,
          text: post.caption,
          disable_web_page_preview: false,
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.ok) throw Error("Social provider failed");
    if (account.page_id.startsWith("@"))
      url =
        "https://t.me/" +
        account.page_id.slice(1) +
        "/" +
        result.result.message_id;
  } else {
    const version = process.env.FACEBOOK_GRAPH_VERSION;
    if (!version || !/^v\d+\.\d+$/.test(version))
      throw Error("Facebook API version not configured");
    const response = await fetch(
      "https://graph.facebook.com/" +
        version +
        "/" +
        encodeURIComponent(account.page_id) +
        "/feed",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({ message: post.caption }),
        signal: AbortSignal.timeout(20000),
      },
    );
    const result = await response.json();
    if (!response.ok || !result.id) throw Error("Social provider failed");
    url = "https://www.facebook.com/" + result.id;
  }
  const { error } = await db
    .from("social_posts")
    .update({ status: "published", external_url: url, error: null })
    .eq("id", id);
  if (error) throw Error("Delivery state unknown; review before retry");
}
