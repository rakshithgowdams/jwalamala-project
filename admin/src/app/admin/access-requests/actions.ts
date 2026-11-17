"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { invalidateDeskProfile, requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { allSections, grantableKeys, permissionsFor } from "@/lib/admin/sections";

type Result = { ok?: true; error?: string; id?: string };
type Fail = (en: string, kn: string, hi: string) => Result;

const uuid = z.uuid();
const noteSchema = z.string().trim().max(1000).default("");
const sectionKey = z.enum(grantableKeys as [string, ...string[]]);

export type AccessRequestRow = {
  id: string;
  sectionKey: string;
  sectionLabel: { en: string; kn: string; hi: string };
  status: string;
  staffNote: string;
  adminNote: string;
  requesterId: string;
  requesterName: string;
  createdAt: string;
  reviewedAt: string | null;
};

async function gate() {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  const server = getAdminClient();
  if (!server)
    return {
      denied: fail(
        "Access requests need the server key in admin/.env.local.",
        "ಪ್ರವೇಶ ವಿನಂತಿಗಳಿಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.",
        "पहुँच अनुरोधों के लिए admin/.env.local में सर्वर कुंजी चाहिए।",
      ) as Result,
    };
  return { server, user, profile, fail, isAdmin: profile.role === "admin" };
}

function touchPaths() {
  revalidatePath("/admin/access-requests");
  revalidatePath("/staff/access-requests");
  revalidatePath("/admin/no-access");
  revalidatePath("/staff/no-access");
  revalidatePath("/admin/staff");
}

/** Lightweight status check used after the restricted page paints. */
export async function getOpenAccessRequestStatus(input: unknown): Promise<{ open?: boolean }> {
  const parsed = z.object({ sectionKey }).safeParse(input);
  if (!parsed.success) return { open: false };
  try {
    const { user, profile } = await requireStaff();
    if (profile.role !== "staff") return { open: false };
    const server = getAdminClient();
    if (!server) return { open: false };
    const { data } = await server
      .from("staff_access_requests")
      .select("id")
      .eq("requester_id", user.id)
      .eq("section_key", parsed.data.sectionKey)
      .eq("status", "requested")
      .maybeSingle();
    return { open: Boolean(data) };
  } catch {
    return { open: false };
  }
}

function sectionLabel(key: string) {
  const found = allSections.find((s) => s.key === key);
  return found?.label || { en: key, kn: key, hi: key };
}

async function writePermissions(
  server: NonNullable<ReturnType<typeof getAdminClient>>,
  userId: string,
  sections: string[],
) {
  const { error } = await server.from("user_permissions").delete().eq("user_id", userId);
  if (error) return error;
  const rows = permissionsFor(sections).map((permission) => ({ user_id: userId, permission }));
  return (await server.from("user_permissions").insert(rows)).error;
}

/** Staff: ask for a desk feature they do not have yet. */
export async function createAccessRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, profile, fail } = access;
  if (profile.role !== "staff")
    return fail(
      "Only staff accounts can request features.",
      "ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಸಿಬ್ಬಂದಿ ಖಾತೆಗಳು ಮಾತ್ರ ವಿನಂತಿಸಬಹುದು.",
      "केवल स्टाफ़ खाते सुविधाएँ अनुरोध कर सकते हैं।",
    );

  const parsed = z.object({ sectionKey, staffNote: noteSchema }).safeParse(input);
  if (!parsed.success)
    return fail("Pick a valid desk feature to request.", "ಮಾನ್ಯ ವೈಶಿಷ್ಟ್ಯ ಆಯ್ಕೆಮಾಡಿ.", "मान्य डेस्क सुविधा चुनें।");

  const key = parsed.data.sectionKey;
  const { data: row } = await server
    .from("profiles")
    .select("admin_sections")
    .eq("id", user.id)
    .maybeSingle();
  const held = new Set((row?.admin_sections as string[] | null) || []);
  if (held.has(key))
    return fail(
      "You already have access to this feature.",
      "ನೀವು ಈಗಾಗಲೇ ಈ ವೈಶಿಷ್ಟ್ಯಕ್ಕೆ ಪ್ರವೇಶ ಹೊಂದಿದ್ದೀರಿ.",
      "आपके पास पहले से इस सुविधा की पहुँच है।",
    );

  const { data: open } = await server
    .from("staff_access_requests")
    .select("id")
    .eq("requester_id", user.id)
    .eq("section_key", key)
    .eq("status", "requested")
    .maybeSingle();
  if (open)
    return fail(
      "You already have an open request for this feature.",
      "ಈ ವೈಶಿಷ್ಟ್ಯಕ್ಕೆ ಈಗಾಗಲೇ ತೆರೆದ ವಿನಂತಿ ಇದೆ.",
      "इस सुविधा के लिए पहले से खुला अनुरोध है।",
    );

  const { data, error } = await server
    .from("staff_access_requests")
    .insert({
      requester_id: user.id,
      section_key: key,
      staff_note: parsed.data.staffNote,
      status: "requested",
    })
    .select("id")
    .single();
  if (error || !data)
    return fail(
      error?.message || "Could not send the access request.",
      "ಪ್ರವೇಶ ವಿನಂತಿ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
      "पहुँच अनुरोध नहीं भेजा जा सका।",
    );

  touchPaths();
  return { ok: true, id: data.id as string };
}

/** Admin: approve → add section to staff and refresh permissions. */
export async function reviewAccessRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  if (!isAdmin)
    return fail(
      "Only administrators can review access requests.",
      "ಪ್ರವೇಶ ವಿನಂತಿಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಪರಿಶೀಲಿಸಬಹುದು.",
      "केवल एडमिन पहुँच अनुरोधों की समीक्षा कर सकते हैं।",
    );

  const parsed = z
    .object({
      id: uuid,
      decision: z.enum(["approve", "reject"]),
      adminNote: noteSchema,
    })
    .safeParse(input);
  if (!parsed.success) return fail("Invalid review.", "ಅಮಾನ್ಯ ಪರಿಶೀಲನೆ.", "अमान्य समीक्षा।");

  const { data: row } = await server
    .from("staff_access_requests")
    .select("id,requester_id,section_key,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");
  if (row.status !== "requested")
    return fail(
      "Only open requests can be reviewed.",
      "ತೆರೆದ ವಿನಂತಿಗಳನ್ನು ಮಾತ್ರ ಪರಿಶೀಲಿಸಬಹುದು.",
      "केवल खुले अनुरोधों की समीक्षा हो सकती है।",
    );

  const now = new Date().toISOString();
  if (parsed.data.decision === "reject") {
    if (!parsed.data.adminNote.trim())
      return fail(
        "Add a short note explaining the rejection.",
        "ತಿರಸ್ಕಾರಕ್ಕೆ ಸಂಕ್ಷಿಪ್ತ ಕಾರಣ ಬರೆಯಿರಿ.",
        "अस्वीकृति का संक्षिप्त कारण लिखें।",
      );
    const { error } = await server
      .from("staff_access_requests")
      .update({
        status: "rejected",
        admin_note: parsed.data.adminNote,
        reviewed_by: user.id,
        reviewed_at: now,
        updated_at: now,
      })
      .eq("id", parsed.data.id);
    if (error)
      return fail(error.message || "Could not reject the request.", "ವಿನಂತಿ ತಿರಸ್ಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध अस्वीकृत नहीं हो सका।");
    touchPaths();
    return { ok: true };
  }

  const section = String(row.section_key);
  if (!grantableKeys.includes(section))
    return fail("This feature cannot be granted to staff.", "ಈ ವೈಶಿಷ್ಟ್ಯವನ್ನು ಸಿಬ್ಬಂದಿಗೆ ನೀಡಲಾಗುವುದಿಲ್ಲ.", "यह सुविधा स्टाफ़ को नहीं दी जा सकती।");

  const { data: staff } = await server
    .from("profiles")
    .select("id,role,admin_sections")
    .eq("id", row.requester_id)
    .maybeSingle();
  if (!staff || staff.role !== "staff")
    return fail("Staff account not found.", "ಸಿಬ್ಬಂದಿ ಖಾತೆ ಸಿಗಲಿಲ್ಲ.", "स्टाफ़ खाता नहीं मिला।");

  const nextSections = [...new Set([...(staff.admin_sections || []), section])].filter((key) =>
    grantableKeys.includes(key),
  );
  const { error: profileError } = await server
    .from("profiles")
    .update({ admin_sections: nextSections })
    .eq("id", staff.id);
  if (profileError)
    return fail(
      profileError.message || "Could not update staff access.",
      "ಸಿಬ್ಬಂದಿ ಪ್ರವೇಶ ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
      "स्टाफ़ पहुँच अपडेट नहीं हो सकी।",
    );

  const permissionError = await writePermissions(server, staff.id as string, nextSections);
  if (permissionError) {
    await server.from("profiles").update({ admin_sections: staff.admin_sections }).eq("id", staff.id);
    return fail(
      permissionError.message || "Could not update staff permissions.",
      "ಸಿಬ್ಬಂದಿ ಅನುಮತಿಗಳನ್ನು ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
      "स्टाफ़ अनुमतियाँ अपडेट नहीं हो सकीं।",
    );
  }

  const { error } = await server
    .from("staff_access_requests")
    .update({
      status: "approved",
      admin_note: parsed.data.adminNote,
      reviewed_by: user.id,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not approve the request.", "ವಿನಂತಿ ಅನುಮೋದಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध स्वीकृत नहीं हो सका।");

  invalidateDeskProfile(staff.id as string);
  touchPaths();
  return { ok: true };
}

/** Staff cancel their own open request, or admin cancel any open one. */
export async function cancelAccessRequest(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  const parsed = z.object({ id: uuid }).safeParse(input);
  if (!parsed.success) return fail("Invalid request.", "ಅಮಾನ್ಯ ವಿನಂತಿ.", "अमान्य अनुरोध।");

  const { data: row } = await server
    .from("staff_access_requests")
    .select("id,requester_id,status")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (!row) return fail("Request not found.", "ವಿನಂತಿ ಸಿಗಲಿಲ್ಲ.", "अनुरोध नहीं मिला।");
  if (row.status !== "requested")
    return fail("Only open requests can be cancelled.", "ತೆರೆದ ವಿನಂತಿಗಳನ್ನು ಮಾತ್ರ ರದ್ದುಮಾಡಬಹುದು.", "केवल खुले अनुरोध रद्द हो सकते हैं।");
  if (!isAdmin && row.requester_id !== user.id)
    return fail("You can only cancel your own request.", "ನಿಮ್ಮ ವಿನಂತಿಯನ್ನು ಮಾತ್ರ ರದ್ದುಮಾಡಬಹುದು.", "आप केवल अपना अनुरोध रद्द कर सकते हैं।");

  const now = new Date().toISOString();
  const { error } = await server
    .from("staff_access_requests")
    .update({ status: "cancelled", updated_at: now })
    .eq("id", parsed.data.id);
  if (error)
    return fail(error.message || "Could not cancel the request.", "ವಿನಂತಿ ರದ್ದುಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "अनुरोध रद्द नहीं हो सका।");

  touchPaths();
  return { ok: true };
}
