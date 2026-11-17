"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";

type Result = {
  ok?: true;
  error?: string;
  assigned?: number;
  added?: number;
  removed?: number;
};
type Fail = (en: string, kn: string, hi: string) => Result;

export const TASK_CONTENT_TYPES = ["article", "video", "short"] as const;
export type TaskContentType = (typeof TASK_CONTENT_TYPES)[number];

const contentTypeSchema = z.enum(TASK_CONTENT_TYPES);

function parseBatchLabel(
  label: string,
): { contentType: TaskContentType | null; fromPos: number; toPos: number } | null {
  const match = /^(?:(article|video|short):)?(\d+)-(\d+)$/.exec(label.trim());
  if (!match) return null;
  const fromPos = Number(match[2]);
  const toPos = Number(match[3]);
  if (!Number.isFinite(fromPos) || !Number.isFinite(toPos) || toPos < fromPos) return null;
  const contentType = (match[1] as TaskContentType | undefined) || null;
  return { contentType, fromPos, toPos };
}

function formatBatchLabel(contentType: TaskContentType, fromPos: number, toPos: number) {
  return `${contentType}:${fromPos}-${toPos}`;
}

async function loadPostsInRange(
  server: NonNullable<ReturnType<typeof getAdminClient>>,
  fromPos: number,
  toPos: number,
  contentType: TaskContentType,
) {
  const from = fromPos - 1;
  const size = toPos - fromPos + 1;
  return server
    .from("posts")
    .select("id")
    .eq("type", contentType)
    .neq("status", "archived")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range(from, from + size - 1);
}

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

/** Ordered positions are 1-based and inclusive within a content type (e.g. 1–1000). */
const bulkSchema = z.object({
  assigneeId: uuid,
  fromPos: z.coerce.number().int().min(1).max(1_000_000),
  toPos: z.coerce.number().int().min(1).max(1_000_000),
  contentType: contentTypeSchema.default("article"),
  notes: notesSchema,
});

const singleSchema = z.object({
  assigneeId: uuid,
  postId: uuid,
  contentType: contentTypeSchema.default("article"),
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

/** Assign one post (of the chosen content type) to one staff member. */
export async function assignSingleArticle(input: unknown): Promise<Result> {
  const access = await requireAdminAssign();
  if ("denied" in access) return access.denied;
  const { server, userId, fail } = access;
  const parsed = singleSchema.safeParse(input);
  if (!parsed.success)
    return fail("Choose a staff member and an article.", "ಸಿಬ್ಬಂದಿ ಮತ್ತು ಲೇಖನವನ್ನು ಆಯ್ಕೆಮಾಡಿ.", "स्टाफ़ और लेख चुनें।");
  const bad = await assertStaffAssignee(server, parsed.data.assigneeId, fail);
  if (bad) return bad;
  const { data: post } = await server
    .from("posts")
    .select("id,type")
    .eq("id", parsed.data.postId)
    .neq("status", "archived")
    .maybeSingle();
  if (!post)
    return fail("That article was not found.", "ಆ ಲೇಖನ ಸಿಗಲಿಲ್ಲ.", "वह लेख नहीं मिला।");
  if ((post.type as string) !== parsed.data.contentType)
    return fail(
      "That item does not match the selected content type.",
      "ಆ ಐಟಂ ಆಯ್ಕೆಮಾಡಿದ ವಿಷಯ ಪ್ರಕಾರಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ.",
      "वह आइटम चुने गए कंटेंट प्रकार से मेल नहीं खाता।",
    );
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
  const { assigneeId, fromPos, toPos, notes, contentType } = parsed.data;
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

  const { data: posts, error: listError } = await loadPostsInRange(
    server,
    fromPos,
    toPos,
    contentType,
  );
  if (listError)
    return fail(listError.message || "Could not load articles.", "ಲೇಖನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "लेख लोड नहीं हो सके।");
  if (!posts?.length)
    return fail(
      "No items found in that range for the selected type.",
      "ಆಯ್ಕೆಮಾಡಿದ ಪ್ರಕಾರದ ಆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಐಟಂಗಳು ಸಿಗಲಿಲ್ಲ.",
      "चुने प्रकार की उस रेंज में आइटम नहीं मिले।",
    );

  const batch_label = formatBatchLabel(contentType, fromPos, fromPos + posts.length - 1);
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

/**
 * Staff may only mark their own open task done.
 * Create / update / cancel / reopen / delete stay admin-only.
 */
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

  const isAdmin = profile.role === "admin";
  if (!isAdmin) {
    if (task.assignee_id !== user.id)
      return fail("You cannot change this task.", "ಈ ಕಾರ್ಯವನ್ನು ನೀವು ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.", "आप यह कार्य नहीं बदल सकते।");
    if (parsed.data.status !== "done")
      return fail(
        "Only an administrator can create, update, or delete assignments.",
        "ನಿಯೋಜನೆಗಳನ್ನು ರಚಿಸಲು, ನವೀಕರಿಸಲು ಅಥವಾ ಅಳಿಸಲು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಸಾಧ್ಯ.",
        "केवल एडमिन असाइनमेंट बना / अपडेट / हटा सकते हैं।",
      );
  }

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
 * Returns how many rows were cancelled. Admin only.
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
  return { ok: true, assigned, removed: assigned };
}

const updateBatchSchema = z.object({
  assigneeId: uuid,
  batchLabel: z.string().trim().min(1).max(120),
  fromPos: z.coerce.number().int().min(1).max(1_000_000),
  toPos: z.coerce.number().int().min(1).max(1_000_000),
  contentType: contentTypeSchema.optional(),
  notes: notesSchema.optional(),
});

/**
 * Resize an open bulk assignment. Example: change Shashank's 1–2000 to 1–2500
 * (adds articles) or 1–200 (cancels the extras). Admin only.
 */
export async function updateOpenBatch(input: unknown): Promise<Result> {
  const access = await requireAdminAssign();
  if ("denied" in access) return access.denied;
  const { server, userId, fail } = access;
  const parsed = updateBatchSchema.safeParse(input);
  if (!parsed.success)
    return fail(
      "Enter a valid from–to range to update this batch.",
      "ಬ್ಯಾಚ್ ನವೀಕರಿಸಲು ಮಾನ್ಯ ವ್ಯಾಪ್ತಿ ನಮೂದಿಸಿ.",
      "बैच अपडेट करने के लिए मान्य रेंज दर्ज करें।",
    );

  const { assigneeId, batchLabel, fromPos, toPos } = parsed.data;
  if (toPos < fromPos)
    return fail(
      "The end number must be greater than or equal to the start number.",
      "ಕೊನೆಯ ಸಂಖ್ಯೆ ಪ್ರಾರಂಭಕ್ಕಿಂತ ದೊಡ್ಡದು ಅಥವಾ ಸಮನಾಗಿರಬೇಕು.",
      "अंतिम संख्या शुरू से बड़ी या बराबर होनी चाहिए।",
    );
  if (toPos - fromPos + 1 > 5000)
    return fail(
      "Keep the updated batch at most 5,000 articles.",
      "ನವೀಕರಿಸಿದ ಬ್ಯಾಚ್ ಗರಿಷ್ಠ 5,000 ಲೇಖನಗಳಿರಲಿ.",
      "अपडेटेड बैच अधिकतम 5,000 लेख रखें।",
    );
  const parsedLabel = parseBatchLabel(batchLabel);
  if (!parsedLabel)
    return fail(
      "This batch label cannot be resized.",
      "ಈ ಬ್ಯಾಚ್ ಲೇಬಲ್ ಅನ್ನು ಬದಲಾಯಿಸಲಾಗುವುದಿಲ್ಲ.",
      "इस बैच लेबल का आकार नहीं बदल सकते।",
    );

  const bad = await assertStaffAssignee(server, assigneeId, fail);
  if (bad) return bad;

  let contentType: TaskContentType =
    parsed.data.contentType || parsedLabel.contentType || "article";
  if (!parsed.data.contentType && !parsedLabel.contentType) {
    const { data: sample } = await server
      .from("article_tasks")
      .select("post_id,posts(type)")
      .eq("assignee_id", assigneeId)
      .eq("batch_label", batchLabel)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    const joined = sample?.posts as { type?: string } | { type?: string }[] | null | undefined;
    const sampleType = Array.isArray(joined) ? joined[0]?.type : joined?.type;
    if (sampleType === "article" || sampleType === "video" || sampleType === "short") {
      contentType = sampleType;
    }
  }

  const { data: posts, error: listError } = await loadPostsInRange(
    server,
    fromPos,
    toPos,
    contentType,
  );
  if (listError)
    return fail(listError.message || "Could not load articles.", "ಲೇಖನಗಳನ್ನು ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "लेख लोड नहीं हो सके।");
  if (!posts?.length)
    return fail(
      "No items found in that range for the selected type.",
      "ಆಯ್ಕೆಮಾಡಿದ ಪ್ರಕಾರದ ಆ ವ್ಯಾಪ್ತಿಯಲ್ಲಿ ಐಟಂಗಳು ಸಿಗಲಿಲ್ಲ.",
      "चुने प्रकार की उस रेंज में आइटम नहीं मिले।",
    );

  const newPostIds = posts.map((post) => post.id as string);
  const newPostSet = new Set(newPostIds);
  const newLabel = formatBatchLabel(contentType, fromPos, fromPos + posts.length - 1);
  const now = new Date().toISOString();
  const notes =
    typeof parsed.data.notes === "string" ? parsed.data.notes : undefined;

  const { data: existingRows, error: existingError } = await server
    .from("article_tasks")
    .select("id,post_id,notes")
    .eq("assignee_id", assigneeId)
    .eq("batch_label", batchLabel)
    .eq("status", "open");
  if (existingError)
    return fail(existingError.message || "Could not load the batch.", "ಬ್ಯಾಚ್ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच लोड नहीं हो सका।");

  const existing = existingRows || [];
  if (!existing.length)
    return fail(
      "No open assignments left in that batch.",
      "ಆ ಬ್ಯಾಚ್‌ನಲ್ಲಿ ತೆರೆದ ನಿಯೋಜನೆಗಳಿಲ್ಲ.",
      "उस बैच में कोई खुला असाइनमेंट नहीं।",
    );

  const keepIds: string[] = [];
  const removeIds: string[] = [];
  const existingPostIds = new Set<string>();
  for (const row of existing) {
    const postId = row.post_id as string;
    existingPostIds.add(postId);
    if (newPostSet.has(postId)) keepIds.push(row.id as string);
    else removeIds.push(row.id as string);
  }

  let removed = 0;
  for (let i = 0; i < removeIds.length; i += IN_CHUNK) {
    const slice = removeIds.slice(i, i + IN_CHUNK);
    const { error } = await server
      .from("article_tasks")
      .update({ status: "cancelled", updated_at: now })
      .in("id", slice);
    if (error)
      return fail(error.message || "Could not shrink the batch.", "ಬ್ಯಾಚ್ ಕಡಿಮೆ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच छोटा नहीं हो सका।");
    removed += slice.length;
  }

  const keepPatch: { batch_label: string; updated_at: string; notes?: string } = {
    batch_label: newLabel,
    updated_at: now,
  };
  if (typeof notes === "string") keepPatch.notes = notes;
  for (let i = 0; i < keepIds.length; i += IN_CHUNK) {
    const slice = keepIds.slice(i, i + IN_CHUNK);
    const { error } = await server.from("article_tasks").update(keepPatch).in("id", slice);
    if (error)
      return fail(error.message || "Could not relabel the batch.", "ಬ್ಯಾಚ್ ಲೇಬಲ್ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच लेबल नहीं बदला जा सका।");
  }

  const toAdd = newPostIds.filter((id) => !existingPostIds.has(id));
  const inheritedNotes =
    typeof notes === "string" ? notes : ((existing[0].notes as string) || "");

  const { error: addError, count: added } = await insertOpenTasks(
    server,
    toAdd.map((postId) => ({
      post_id: postId,
      assignee_id: assigneeId,
      assigned_by: userId,
      batch_label: newLabel,
      notes: inheritedNotes,
    })),
  );
  if (addError)
    return fail(addError.message || "Could not expand the batch.", "ಬ್ಯಾಚ್ ವಿಸ್ತರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "बैच बड़ा नहीं हो सका।");

  revalidatePath("/admin/tasks");
  revalidatePath("/staff/tasks");
  return {
    ok: true,
    assigned: keepIds.length + added,
    added,
    removed,
  };
}

export type ArticleSearchHit = {
  id: string;
  title: string;
  status: string;
  type: string;
  thumbnail: string | null;
  updatedAt: string | null;
};

/** Live title search across the library for the Tasks card picker. */
export async function searchArticlesForAssign(
  query: string,
  contentType?: TaskContentType | string,
): Promise<ArticleSearchHit[]> {
  const [{ profile }, server] = await Promise.all([requireStaff(), Promise.resolve(getAdminClient())]);
  if (profile.role !== "admin" || !server) return [];
  const q = query.trim().slice(0, 120).replace(/[%_,]/g, " ");
  const type = contentTypeSchema.safeParse(contentType);
  let request = server
    .from("posts")
    .select("id,title_kn,status,type,thumbnail_url,updated_at")
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(24);
  if (type.success) request = request.eq("type", type.data);
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
