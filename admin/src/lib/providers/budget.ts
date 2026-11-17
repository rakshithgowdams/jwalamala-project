import "server-only";
import { getAdminClient } from "@/lib/supabase/admin";
export type ProviderId = "weather" | "tts" | "ai" | "email" | "social" | "push";
export async function reserveBudget(provider: ProviderId, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0)
    throw Error("Invalid budget reservation");
  const db = getAdminClient();
  if (!db) throw Error("Service unavailable");
  const { data, error } = await db.rpc("consume_provider_budget", {
    provider,
    amount,
  });
  if (error || data !== true)
    throw Error("Provider disabled or budget exhausted");
  return db;
}
export async function providerOptions(provider: ProviderId) {
  const db = getAdminClient();
  if (!db) return null;
  const { data } = await db
    .from("provider_settings")
    .select("enabled,options")
    .eq("id", provider)
    .maybeSingle();
  return data?.enabled ? (data.options as Record<string, unknown>) : null;
}
