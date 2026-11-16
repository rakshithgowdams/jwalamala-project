"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";

type Result = { ok?: true; error?: string; id?: string };
type Fail = (en: string, kn: string, hi: string) => Result;

const uuid = z.uuid();
const noteSchema = z.string().trim().max(1000).default("");
const ACTIVE = ["requested", "processing", "ready"] as const;

function isGoogleDriveUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return host === "drive.google.com" || host === "docs.google.com";
  } catch {
    return false;
  }
}

async function gate() {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  const server = getAdminClient();
  if (!server)
    return {
      denied: fail(
        "Task requests need the server key in admin/.env.local.",
        "ಕಾರ್ಯ ವಿನಂತಿಗಳಿಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.",
        "कार्य अनुरोधों के लिए admin/.env.local में सर्वर कुंजी चाहिए।",
      ) as Result,
    };
  return { server, user, profile, fail, isAdmin: profile.role === "admin" };
}

function touchPaths(postId?: string) {
  revalidatePath("/admin/tasks");
  revalidatePath("/admin/task-requests");
  if (postId) revalidatePath(`/admin/posts/${postId}`);
}

/** Staff: open an assigned task → submit verification request. */
export async function createTaskRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail } = access;
  const parsed = z.object({ taskId: uuid, staffNote: noteSchema }).safeParse(input);
  if (!parsed.success)
    return fail("Pick an assigned article and add a short note.", "ನಿಯೋಜಿತ ಲೇಖನ ಮತ್ತು ಟಿಪ್ಪಣಿ ಬೇಕು.", "असाइन लेख और नोट चाहिए।");

  const { data: task } = await server
    .from("article_tasks")
    .select("id,post_id,assignee_id,status")
    .eq("id", parsed.data.taskId)
    .maybeSingle();
  if (!task) return fail("Task not found.", "ಕಾರ್ಯ ಸಿಗಲಿಲ್ಲ.", "कार्य नहीं मिला।");
  if (task.assignee_id !== user.id)
    return fail("You can only request on your own assignments.", "ನಿಮ್ಮ ನಿಯೋಜನೆಗಳ ಮೇಲೆ ಮಾತ್ರ ವಿನಂತಿ.", "केवल अपने असाइनमेंट पर अनुरोध।");
  if (task.status !== "open")
    return fail("Only open assignments can be requested.", "ತೆರೆದ ನಿಯೋಜನೆಗಳ ಮೇಲೆ ಮಾತ್ರ ವಿನಂತಿ.", "केवल खुले असाइनमेंट पर अनुरोध।");

  const { data: active } = await server
    .from("article_task_requests")
    .select("id")
    .eq("task_id", task.id)
    .in("status", [...ACTIVE])
    .maybeSingle();
  if (active)
    return fail(
      "This assignment already has an active request.",
      "ಈ ನಿಯೋಜನೆಗೆ ಈಗಾಗಲೇ ಸಕ್ರಿಯ ವಿನಂತಿ ಇದೆ.",
      "इस असाइनमेंट पर पहले से सक्रिय अनुरोध है।",
    );

  const { data, error } = await server
    .from("article_task_requests")
    .insert({
      task_id: task.id,
      post_id: task.post_id,
      requester_id: user.id,
      status: "requested",
      staff_note: parsed.data.staffNote,
    })
    .select("id")
    .single();
  if (error || !data)
    return fail(error?.message || "Could not create the request.", "ವಿನಂತಿ ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध नहीं बन सका।");

  touchPaths(task.post_id as string);
  return { ok: true, id: data.id as string };
}

/** Admin: approve with Drive link → processing, or reject with note. */
export async function reviewTaskRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  if (!isAdmin)
    return fail("Only administrators can review requests.", "ವಿನಂತಿಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಪರಿಶೀಲಿಸಬಹುದು.", "केवल एडमिन अनुरोधों की समीक्षा कर सकते हैं।");

  const parsed = z
    .object({
      id: uuid,
      decision: z.enum(["approve", "reject"]),
      driveUrl: z.string().trim().max(2000).optional().default(""),
      adminNote: noteSchema,
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid review.", "ಅಮಾನ್ಯ ಪರಿಶೀಲನೆ.", "अमान्य समीक्षा।");

  const { data: row } = await server
    .from("article_task_requests")
    .select("id,post_id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");
  if (row.status !== "requested" && row.status !== "rejected")
    return fail(
      "Only requested (or rejected) items can be reviewed.",
      "ವಿನಂತಿಸಿದ ಅಥವಾ ತಿರಸ್ಕರಿಸಿದ ಅಂಶಗಳನ್ನು ಮಾತ್ರ ಪರಿಶೀಲಿಸಬಹುದು.",
      "केवल अनुरोधित या अस्वीकृत आइटम की समीक्षा हो सकती है।",
    );

  const now = new Date().toISOString();
  if (parsed.data.decision === "approve") {
    const driveUrl = parsed.data.driveUrl.trim();
    if (!isGoogleDriveUrl(driveUrl))
      return fail(
        "Paste a valid Google Drive or Docs link (https).",
        "ಮಾನ್ಯ Google Drive ಅಥವಾ Docs ಲಿಂಕ್ ಅಂಟಿಸಿ (https).",
        "मान्य Google Drive या Docs लिंक चिपकाएँ (https)।",
      );
    const { error } = await server
      .from("article_task_requests")
      .update({
        status: "processing",
        drive_url: driveUrl,
        admin_note: parsed.data.adminNote,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", parsed.data.id);
    if (error)
      return fail(error.message || "Could not approve the request.", "ವಿನಂತಿ ಅನುಮೋದಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध स्वीकृत नहीं हो सका।");
  } else {
    if (!parsed.data.adminNote.trim())
      return fail(
        "Add a short note explaining the rejection.",
        "ತಿರಸ್ಕಾರಕ್ಕೆ ಸಂಕ್ಷಿಪ್ತ ಕಾರಣ ಬರೆಯಿರಿ.",
        "अस्वीकृति का संक्षिप्त कारण लिखें।",
      );
    const { error } = await server
      .from("article_task_requests")
      .update({
        status: "rejected",
        admin_note: parsed.data.adminNote,
        drive_url: "",
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", parsed.data.id);
    if (error)
      return fail(error.message || "Could not reject the request.", "ವಿನಂತಿ ತಿರಸ್ಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध अस्वीकृत नहीं हो सका।");
  }

  touchPaths(row.post_id as string);
  return { ok: true };
}

/** Staff: processing → ready (send back to admin for publish). */
export async function submitTaskRequestReady(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail } = access;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail("Invalid request.", "ಅಮಾನ್ಯ ವಿನಂತಿ.", "अमान्य अनुरोध।");

  const { data: row } = await server
    .from("article_task_requests")
    .select("id,post_id,requester_id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");
  if (row.requester_id !== user.id)
    return fail("You can only submit your own request.", "ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಮಾತ್ರ ಕಳುಹಿಸಬಹುದು.", "आप केवल अपना अनुरोध भेज सकते हैं।");
  if (row.status !== "processing")
    return fail(
      "Only processing requests can be sent to admin.",
      "ಸಂಸ್ಕರಣೆಯಲ್ಲಿರುವ ವಿನಂತಿಗಳನ್ನು ಮಾತ್ರ ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಬಹುದು.",
      "केवल प्रोसेसिंग अनुरोध एडमिन को भेजे जा सकते हैं।",
    );

  const now = new Date().toISOString();
  const { error } = await server
    .from("article_task_requests")
    .update({ status: "ready", ready_at: now, updated_at: now })
    .eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not send to admin.", "ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "एडमिन को नहीं भेजा जा सका।");

  touchPaths(row.post_id as string);
  return { ok: true };
}

/** Admin: ready → done after publish. */
export async function completeTaskRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail, isAdmin } = access;
  if (!isAdmin)
    return fail("Only administrators can complete requests.", "ವಿನಂತಿಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಪೂರ್ಣಗೊಳಿಸಬಹುದು.", "केवल एडमिन अनुरोध पूरे कर सकते हैं।");

  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail("Invalid request.", "ಅಮಾನ್ಯ ವಿನಂತಿ.", "अमान्य अनुरोध।");

  const { data: row } = await server
    .from("article_task_requests")
    .select("id,post_id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");
  if (row.status !== "ready")
    return fail(
      "Only ready requests can be marked done.",
      "ಸಿದ್ಧ ವಿನಂತಿಗಳನ್ನು ಮಾತ್ರ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಬಹುದು.",
      "केवल तैयार अनुरोध पूर्ण चिह्नित हो सकते हैं।",
    );

  const now = new Date().toISOString();
  const { error } = await server
    .from("article_task_requests")
    .update({ status: "done", done_at: now, updated_at: now })
    .eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not complete the request.", "ವಿನಂತಿ ಪೂರ್ಣಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध पूरा नहीं हो सका।");

  touchPaths(row.post_id as string);
  return { ok: true };
}

/** Admin, or requester while still requested. */
export async function cancelTaskRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail("Invalid request.", "ಅಮಾನ್ಯ ವಿನಂತಿ.", "अमान्य अनुरोध।");

  const { data: row } = await server
    .from("article_task_requests")
    .select("id,post_id,requester_id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");

  const isOwner = row.requester_id === user.id;
  if (!isAdmin && !isOwner)
    return fail("You cannot cancel this request.", "ಈ ವಿನಂತಿಯನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.", "आप यह अनुरोध रद्द नहीं कर सकते।");
  if (!isAdmin && row.status !== "requested")
    return fail(
      "You can only cancel while the request is waiting for review.",
      "ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯುತ್ತಿರುವಾಗ ಮಾತ್ರ ರದ್ದುಗೊಳಿಸಬಹುದು.",
      "समीक्षा की प्रतीक्षा में ही रद्द कर सकते हैं।",
    );
  if (!ACTIVE.includes(row.status as (typeof ACTIVE)[number]) && row.status !== "rejected")
    return fail("This request can no longer be cancelled.", "ಈ ವಿನಂತಿಯನ್ನು ಇನ್ನು ರದ್ದುಗೊಳಿಸಲಾಗುವುದಿಲ್ಲ.", "यह अनुरोध अब रद्द नहीं हो सकता।");

  const now = new Date().toISOString();
  const { error } = await server
    .from("article_task_requests")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not cancel the request.", "ವಿನಂತಿ ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध रद्द नहीं हो सका।");

  touchPaths(row.post_id as string);
  return { ok: true };
}

export type TaskRequestRow = {
  id: string;
  taskId: string;
  postId: string;
  title: string;
  thumbnail: string | null;
  videoUrl: string | null;
  postStatus: string;
  slug: string | null;
  status: string;
  staffNote: string;
  adminNote: string;
  driveUrl: string;
  requesterId: string;
  requesterName: string;
  createdAt: string;
  reviewedAt: string | null;
  readyAt: string | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

/** Load active request status map for a set of task ids (Tasks board badges). */
export async function loadActiveRequestsByTaskIds(taskIds: string[]) {
  const access = await gate();
  if ("denied" in access) return {} as Record<string, { id: string; status: string }>;
  const { server } = access;
  if (!taskIds.length) return {};
  const { data } = await server
    .from("article_task_requests")
    .select("id,task_id,status")
    .in("task_id", taskIds)
    .in("status", [...ACTIVE]);
  const map: Record<string, { id: string; status: string }> = {};
  for (const row of data || []) {
    map[row.task_id as string] = { id: row.id as string, status: row.status as string };
  }
  return map;
}
