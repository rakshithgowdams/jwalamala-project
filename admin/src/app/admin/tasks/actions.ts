"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";

type Result = { ok?: true; error?: string; assigned?: number };
type Fail = (en: string, kn: string, hi: string) => Result;

async function requireAdminAssign(): Promise<
  | { denied: Result }
  | { server: NonNullable<ReturnType<typeof getAdminClient>>; userId: string; fail: Fail }
> {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  if (profile.role !== "admin")
    return {
      denied: fail(
        "Only administrators can assign article tasks.",
        "ಲೇಖನ ಕಾರ್ಯಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ನಿಯೋಜಿಸಬಹುದು.",
        "केवल एडमिन लेख कार्य असाइन कर सकते हैं।",
      ),
    };
  const server = getAdminClient();
  if (!server)
    return {
      denied: fail(
        "Task assignment needs the server key in admin/.env.local.",
        "ಕಾರ್ಯ ನಿಯೋಜನೆಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.",
        "कार्य असाइनमेंट के लिए admin/.env.local में सर्वर कुंजी चाहिए।",
      ),
    };
  return { server, userId: user.id, fail };
}

const uuid = z.uuid();
const notesSchema = z.string().trim().max(500).default("");

/** Ordered article positions are 1-based and inclusive (e.g. 1–1000). */
const bulkSchema = z.object({
  assigneeId: uuid,
  fromPos: z.coerce.number().int().min(1).max(1_000_000),
  toPos: z.coerce.number().int().min(1).max(1_000_000),
  notes: notesSchema,
});

const singleSchema = z.object({
  assigneeId: uuid,
  postId: uuid,
  notes: notesSchema,
});

const statusSchema = z.object({
  id: uuid,
  status: z.enum(["open", "done", "cancelled"]),
});

async function assertStaffAssignee(
  server: NonNullable<ReturnType<typeof getAdminClient>>,
  assigneeId: string,
  fail: Fail,
): Promise<Result | null> {
  const { data } = await server.from("profiles").select("id,role").eq("id", assigneeId).maybeSingle();
  if (!data || data.role !== "staff")
    return fail(
      "Pick a staff account, not an administrator.",
      "ನಿರ್ವಾಹಕರಲ್ಲದ ಸಿಬ್ಬಂದಿ ಖಾತೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
      "एडमिन नहीं, स्टाफ़ खाता चुनें।",
    );
  return null;
}

const IN_CHUNK = 80;

async function insertOpenTasks(
  server: NonNullable<ReturnType<typeof getAdminClient>>,
  rows: {
    post_id: string;
    assignee_id: string;
    assigned_by: string;
    batch_label: string;
    notes: string;
  }[],
) {
  if (!rows.length) return { error: null as null | { message?: string }, count: 0 };
  // Skip posts that already have an open task for this person (chunked — large .in() = Bad Request).
  const postIds = rows.map((r) => r.post_id);
  const taken = new Set<string>();
  for (let i = 0; i < postIds.length; i += IN_CHUNK) {
    const slice = postIds.slice(i, i + IN_CHUNK);
    const { data: existing, error: existingError } = await server
      .from("article_tasks")
      .select("post_id")
      .eq("assignee_id", rows[0].assignee_id)
      .eq("status", "open")
      .in("post_id", slice);
    if (existingError) return { error: existingError, count: 0 };
    for (const row of existing || []) taken.add(row.post_id as string);
  }
  const fresh = rows.filter((r) => !taken.has(r.post_id));
  if (!fresh.length) return { error: null, count: 0 };
  let inserted = 0;
  for (let i = 0; i < fresh.length; i += IN_CHUNK) {
    const slice = fresh.slice(i, i + IN_CHUNK);
    const { error } = await server.from("article_tasks").insert(slice);
    if (error) return { error, count: inserted };
    inserted += slice.length;
  }
  return { error: null, count: inserted };
}

/** Assign one article to one staff member. */
export async function assignSingleArticle(input: unknown): Promise<Result> {
  const access = await requireAdminAssign();
  if ("denied" in access) return access.denied;
  const { server, userId, fail } = access;
  const parsed = singleSchema.safeParse(input);
  if (!parsed.success)
    return fail("Choose a staff member and an article.", "ಸಿಬ್ಬಂದಿ ಮತ್ತು ಲೇಖನವನ್ನು ಆಯ್ಕೆಮಾಡಿ.", "स्टाफ़ और लेख चुनें।");
  const bad = await assertStaffAssignee(server, parsed.data.assigneeId, fail);
  if (bad) return bad;
  const { data: post } = await server.from("posts").select("id").eq("id", parsed.data.postId).neq("status", "archived").maybeSingle();
  if (!post)
    return fail("That article was not found.", "ಆ ಲೇಖನ ಸಿಗಲಿಲ್ಲ.", "वह लेख नहीं मिला।");
  const { error, count } = await insertOpenTasks(server, [
    {
      post_id: post.id,
      assignee_id: parsed.data.assigneeId,
      assigned_by: userId,
      batch_label: "",
      notes: parsed.data.notes,
    },
  ]);
  if (error)
    return fail(error.message || "Could not assign the article.", "ಲೇಖನ ನಿಯೋಜಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "लेख असाइन नहीं हो सका।");
  if (!count)
    return fail(
      "That article is already assigned to this person.",
      "ಆ ಲೇಖನ ಈಗಾಗಲೇ ಈ ವ್ಯಕ್ತಿಗೆ ನಿಯೋಜಿಸಲಾಗಿದೆ.",
      "यह लेख पहले से इस व्यक्ति को असाइन है।",
    );
  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
  return { ok: true, assigned: count };
}

/**
 * Assign a contiguous block of articles (by stable created_at order) to one staff member.
 * Example: from 1 to 1000, then 1001 to 2000 for another person.
 */
export async function assignBulkRange(input: unknown): Promise<Result> {
  const access = await requireAdminAssign();
  if ("denied" in access) return access.denied;
  const { server, userId, fail } = access;
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Enter a valid staff member and a from–to range (for example 1 to 1000).",
      "ಸಿಬ್ಬಂದಿ ಮತ್ತು ಮಾನ್ಯ ವ್ಯಾಪ್ತಿ ನಮೂದಿಸಿ (ಉದಾ. 1 ರಿಂದ 1000).",
      "स्टाफ़ और मान्य रेंज दर्ज करें (जैसे 1 से 1000)।",
    );
  const { assigneeId, fromPos, toPos, notes } = parsed.data;
  if (toPos < fromPos)
    return fail(
      "The end number must be greater than or equal to the start number.",
      "ಕೊನೆಯ ಸಂಖ್ಯೆ ಪ್ರಾರಂಭಕ್ಕಿಂತ ದೊಡ್ಡದು ಅಥವಾ ಸಮನಾಗಿರಬೇಕು.",
      "अंतिम संख्या शुरू से बड़ी या बराबर होनी चाहिए।",
    );
  if (toPos - fromPos + 1 > 5000)
    return fail(
      "Assign at most 5,000 articles in one batch.",
      "ಒಂದು ಬ್ಯಾಚ್‌ನಲ್ಲಿ ಗರಿಷ್ಠ 5,000 ಲೇಖನಗಳನ್ನು ನಿಯೋಜಿಸಿ.",
      "एक बैच में अधिकतम 5,000 लेख असाइन करें।",
    );
  const bad = await assertStaffAssignee(server, assigneeId, fail);
  if (bad) return bad;

  const from = fromPos - 1;
  const size = toPos - fromPos + 1;
  const { data: posts, error: listError } = await server
    .from("posts")
    .select("id")
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + size - 1);
  if (listError)
    return fail(listError.message || "Could not load articles.", "ಲೇಖನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "लेख लोड नहीं हो सके।");
  if (!posts?.length)
    return fail(
      "No articles found in that range.",
      "ಆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಲೇಖನಗಳು ಸಿಗಲಿಲ್ಲ.",
      "उस रेंज में लेख नहीं मिले।",
    );

  const batch_label = `${fromPos}-${fromPos + posts.length - 1}`;
  const { error, count } = await insertOpenTasks(
    server,
    posts.map((post) => ({
      post_id: post.id as string,
      assignee_id: assigneeId,
      assigned_by: userId,
      batch_label,
      notes,
    })),
  );
  if (error)
    return fail(error.message || "Could not assign the batch.", "ಬ್ಯಾಚ್ ನಿಯೋಜಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच असाइन नहीं हो सका।");
  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
  return { ok: true, assigned: count };
}

/** Admin or the assigned staff member can mark a task done / cancelled / reopen. */
export async function setTaskStatus(input: unknown): Promise<Result> {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid task.", "ಅಮಾನ್ಯ ಕಾರ್ಯ.", "अमान्य कार्य।");
  const server = getAdminClient();
  if (!server)
    return fail("Server key missing.", "ಸರ್ವರ್ ಕೀ ಇಲ್ಲ.", "सर्वर कुंजी नहीं है।");

  const { data: task } = await server
    .from("article_tasks")
    .select("id,assignee_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!task) return fail("Task not found.", "ಕಾರ್ಯ ಸಿಗಲಿಲ್ಲ.", "कार्य नहीं मिला।");
  const allowed = profile.role === "admin" || task.assignee_id === user.id;
  if (!allowed)
    return fail("You cannot change this task.", "ಈ ಕಾರ್ಯವನ್ನು ನೀವು ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.", "आप यह कार्य नहीं बदल सकते।");
  if (profile.role !== "admin" && parsed.data.status === "open")
    return fail(
      "Only an administrator can reopen a task.",
      "ಕಾರ್ಯವನ್ನು ಮರುತೆರೆಯಲು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಸಾಧ್ಯ.",
      "केवल एडमिन कार्य दोबारा खोल सकते हैं।",
    );

  const { error } = await server
    .from("article_tasks")
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return fail(error.message || "Could not update the task.", "ಕಾರ್ಯ ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "कार्य अपडेट नहीं हो सका।");
  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
  return { ok: true };
}

const cancelBatchSchema = z.object({
  assigneeId: uuid,
  batchLabel: z.string().trim().min(1).max(120),
});

/**
 * Cancel every open assignment in a numbered bulk batch (e.g. "1-1000" for one staff).
 * Returns how many rows were cancelled.
 */
export async function cancelOpenBatch(input: unknown): Promise<Result> {
  const access = await requireAdminAssign();
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const parsed = cancelBatchSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Pick a staff member and a batch label to cancel.",
      "ರದ್ದುಮಾಡಲು ಸಿಬ್ಬಂದಿ ಮತ್ತು ಬ್ಯಾಚ್ ಲೇಬಲ್ ಆಯ್ಕೆಮಾಡಿ.",
      "रद्द करने के लिए स्टाफ़ और बैच लेबल चुनें।",
    );

  const { assigneeId, batchLabel } = parsed.data;
  const now = new Date().toISOString();
  const { data, error } = await server
    .from("article_tasks")
    .update({ status: "cancelled", updated_at: now })
    .eq("assignee_id", assigneeId)
    .eq("batch_label", batchLabel)
    .eq("status", "open")
    .select("id");
  if (error)
    return fail(error.message || "Could not cancel the batch.", "ಬ್ಯಾಚ್ ರದ್ದುಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच रद्द नहीं हो सका।");

  const assigned = (data || []).length;
  if (!assigned)
    return fail(
      "No open assignments left in that batch.",
      "ಆ ಬ್ಯಾಚ್‌ನಲ್ಲಿ ತೆರೆದ ನಿಯೋಜನೆಗಳಿಲ್ಲ.",
      "उस बैच में कोई खुला असाइनमेंट नहीं।",
    );

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
  return { ok: true, assigned };
}

export type ArticleSearchHit = {
  id: string;
  title: string;
  status: string;
  type: string;
  thumbnail: string | null;
  updatedAt: string | null;
};

/** Live title search across the full article library for the Tasks card picker. */
export async function searchArticlesForAssign(query: string): Promise<ArticleSearchHit[]> {
  const [{ profile }, server] = await Promise.all([requireStaff(), Promise.resolve(getAdminClient())]);
  if (profile.role !== "admin" || !server) return [];
  const q = query.trim().slice(0, 120).replace(/[%_,]/g, " ");
  let request = server
    .from("posts")
    .select("id,title_kn,status,type,thumbnail_url,updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(24);
  if (q) request = request.ilike("title_kn", `%${q}%`);
  const { data } = await request;
  return (data || []).map((row) => ({
    id: row.id as string,
    title: (row.title_kn as string) || "",
    status: (row.status as string) || "",
    type: (row.type as string) || "",
    thumbnail: (row.thumbnail_url as string) || null,
    updatedAt: (row.updated_at as string) || null,
  }));
}
