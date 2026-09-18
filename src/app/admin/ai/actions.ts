"use server";
import { z } from "zod";
import { requirePermission } from "@/lib/v4/permissions";
import { aiInputSchema } from "@/lib/ai/schema";
import { OpenAiNewsroomProvider } from "@/lib/ai/provider";
import { providerOptions } from "@/lib/providers/budget";
import { digest, limitRequest } from "@/lib/v4/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { v4 as t } from "@/content/strings.kn";
export async function draftSuggestions(input: unknown) {
  const { db, user } = await requirePermission("content.edit"),
    parsed = aiInputSchema.safeParse(input);
  if (!parsed.success) return { error: t.failed };
  try {
    const options = await providerOptions("ai");
    if (!options) return { error: t.providerDisabled };
    if (!(await limitRequest("ai:" + user.id, 20)))
      return { error: t.providerDisabled };
    let ids = parsed.data.category_ids;
    if (parsed.data.post_id) {
      const { data: relations } = await db
        .from("post_categories")
        .select("category_id")
        .eq("post_id", parsed.data.post_id);
      ids = [...ids, ...(relations || []).map((r) => r.category_id)];
    }
    const blocked = z
      .array(z.string())
      .catch([])
      .parse(options.blocked_category_ids);
    if (ids.some((id) => blocked.includes(id))) return { error: t.aiSensitive };
    const [tags, categories] = await Promise.all([
      db.from("tags").select("id,name_kn").limit(500),
      db.from("categories").select("id,name_kn").limit(100),
    ]);
    const result = await new OpenAiNewsroomProvider().suggest(
      parsed.data.kind,
      parsed.data.text,
      { tags: tags.data || [], categories: categories.data || [] },
    );
    const service = getAdminClient();
    if (!service) return { error: t.failed };
    const { data, error } = await service
      .from("ai_suggestions")
      .insert({
        post_id: parsed.data.post_id || null,
        user_id: user.id,
        kind: parsed.data.kind,
        input_hash: digest(parsed.data.text),
        output: result.output,
        tokens: result.tokens,
      })
      .select("id")
      .single();
    if (error) return { error: t.failed };
    return { id: String(data.id), output: result.output };
  } catch {
    return { error: t.providerDisabled };
  }
}
export async function acceptSuggestion(id: string, index: number) {
  const { db, user } = await requirePermission("content.edit");
  if (
    !z.uuid().safeParse(id).success ||
    !Number.isInteger(index) ||
    index < 0 ||
    index > 19
  )
    return { error: t.failed };
  const { data: row } = await db
    .from("ai_suggestions")
    .select("output")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!row?.output?.suggestions?.[index]) return { error: t.failed };
  const service = getAdminClient();
  if (!service) return { error: t.failed };
  const { error } = await service
    .from("ai_suggestion_acceptances")
    .upsert({ suggestion_id: id, item_index: index, user_id: user.id });
  return error ? { error: t.failed } : { ok: true };
}
