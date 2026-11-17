import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CHAT_WEBHOOK_SETTINGS_KEY = "chat_webhook";

export type ChatWebhookSecretRecord = {
  secret_hash: string;
  hint: string;
  rotated_at: string;
  rotated_by: string | null;
};

export type ChatWebhookSecretStatus = {
  configured: boolean;
  source: "database" | "env" | "both" | "none";
  hint: string | null;
  rotatedAt: string | null;
};

function digest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function hashChatWebhookSecret(secret: string) {
  return digest(secret);
}

export function createChatWebhookSecret() {
  const raw = randomBytes(32).toString("base64url");
  const secret = `jwchat_${raw}`;
  const hint = `${secret.slice(0, 10)}…${secret.slice(-4)}`;
  return { secret, hint, hash: digest(secret) };
}

function readRecord(value: unknown): ChatWebhookSecretRecord | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.secret_hash !== "string" || typeof row.hint !== "string") return null;
  return {
    secret_hash: row.secret_hash,
    hint: row.hint,
    rotated_at: typeof row.rotated_at === "string" ? row.rotated_at : "",
    rotated_by: typeof row.rotated_by === "string" ? row.rotated_by : null,
  };
}

export async function loadChatWebhookSecretRecord(server: {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: { value?: unknown } | null }>;
      };
    };
  };
}) {
  const { data } = await server
    .from("site_settings")
    .select("value")
    .eq("key", CHAT_WEBHOOK_SETTINGS_KEY)
    .maybeSingle();
  return readRecord(data?.value);
}

export async function getChatWebhookSecretStatus(
  server: Parameters<typeof loadChatWebhookSecretRecord>[0] | null,
): Promise<ChatWebhookSecretStatus> {
  const envConfigured = Boolean(process.env.CHAT_WEBHOOK_SECRET?.trim());
  const record = server ? await loadChatWebhookSecretRecord(server) : null;
  const dbConfigured = Boolean(record?.secret_hash);

  let source: ChatWebhookSecretStatus["source"] = "none";
  if (dbConfigured && envConfigured) source = "both";
  else if (dbConfigured) source = "database";
  else if (envConfigured) source = "env";

  return {
    configured: dbConfigured || envConfigured,
    source,
    hint: record?.hint || (envConfigured ? "CHAT_WEBHOOK_SECRET (env)" : null),
    rotatedAt: record?.rotated_at || null,
  };
}

export async function verifyChatWebhookToken(
  server: Parameters<typeof loadChatWebhookSecretRecord>[0] | null,
  token: string,
) {
  if (!token) return false;

  const envSecret = process.env.CHAT_WEBHOOK_SECRET?.trim() || "";
  if (envSecret && safeEqual(token, envSecret)) return true;

  if (!server) return false;
  const record = await loadChatWebhookSecretRecord(server);
  if (!record?.secret_hash) return false;
  return safeEqual(digest(token), record.secret_hash);
}
