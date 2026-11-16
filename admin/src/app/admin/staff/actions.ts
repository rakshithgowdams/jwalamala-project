"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import { grantableKeys, permissionsFor } from "@/lib/admin/sections";
import { getUiStrings } from "@/lib/i18n/server";

type Result = { ok?: true; error?: string };
type Server = NonNullable<ReturnType<typeof getAdminClient>>;

const DISABLED_FOR = "876000h";
const sectionKey = z.enum(grantableKeys as [string, ...string[]]);
const details = z.object({
  name: z.string().trim().min(2).max(100),
  designation: z.string().trim().min(2).max(80),
  email: z.email().trim().toLowerCase().max(254),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9][0-9 ()-]{6,19}$/)
    .or(z.literal("")),
  sections: z.array(sectionKey).max(100),
});
const createSchema = details.extend({ password: z.string().min(MIN_PASSWORD_LENGTH).max(72) });
const updateSchema = details.extend({
  id: z.uuid(),
  password: z.string().max(72).refine((value) => !value || value.length >= MIN_PASSWORD_LENGTH),
});
const idSchema = z.uuid();

type Fail = (en: string, kn: string, hi: string) => Result;

/** Only administrators manage staff; nobody can change their own account here. */
async function requireAdmin(target?: string): Promise<{ denied: Result } | { server: Server; fail: Fail }> {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail: Fail = (en, kn, hi) => ({ error: tr({ en, kn, hi }) as string });
  if (profile.role !== "admin")
    return { denied: fail("Only administrators can manage staff.", "ಸಿಬ್ಬಂದಿಯನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ನಿರ್ವಹಿಸಬಹುದು.", "केवल एडमिन स्टाफ़ प्रबंधित कर सकते हैं।") };
  if (target && target === user.id)
    return { denied: fail("You cannot change your own account here.", "ನಿಮ್ಮ ಸ್ವಂತ ಖಾತೆಯನ್ನು ಇಲ್ಲಿ ಬದಲಾಯಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.", "आप यहाँ अपना खाता नहीं बदल सकते।") };
  const server = getAdminClient();
  if (!server)
    return { denied: fail("Staff management needs the server key in admin/.env.local.", "ಸಿಬ್ಬಂದಿ ನಿರ್ವಹಣೆಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.", "स्टाफ़ प्रबंधन के लिए admin/.env.local में सर्वर कुंजी चाहिए।") };
  return { server, fail };
}

/** Grants exactly the permissions the chosen features need, replacing the old set. */
async function writePermissions(server: Server, userId: string, sections: string[] | null) {
  const { error } = await server.from("user_permissions").delete().eq("user_id", userId);
  if (error) return error;
  if (!sections) return null;
  const rows = permissionsFor(sections).map((permission) => ({ user_id: userId, permission }));
  return (await server.from("user_permissions").insert(rows)).error;
}

async function staffTarget(server: Server, id: string) {
  const { data } = await server.from("profiles").select("id,role,admin_sections").eq("id", id).maybeSingle();
  return data?.role === "staff" ? (data as { id: string; admin_sections: string[] | null }) : null;
}

export async function createStaff(input: unknown): Promise<Result> {
  const access = await requireAdmin();
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.some((issue) => issue.path.includes("email"));
    if (emailIssue)
      return fail(
        "Enter a full email like name@gmail.com (include .com).",
        "ಪೂರ್ಣ ಇಮೇಲ್ ನಮೂದಿಸಿ, ಉದಾ: name@gmail.com (.com ಸೇರಿಸಿ).",
        "पूरा ईमेल लिखें जैसे name@gmail.com (.com शामिल करें)।",
      );
    return fail(
      `Check the details: name, designation, a valid email, phone digits only, and a password of ${MIN_PASSWORD_LENGTH}-72 characters.`,
      `ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ: ಹೆಸರು, ಹುದ್ದೆ, ಸರಿಯಾದ ಇಮೇಲ್, ಫೋನ್ ಸಂಖ್ಯೆ ಮತ್ತು ${MIN_PASSWORD_LENGTH}-72 ಅಕ್ಷರಗಳ ಪಾಸ್‌ವರ್ಡ್.`,
      `विवरण जाँचें: नाम, पद, सही ईमेल, फ़ोन नंबर और ${MIN_PASSWORD_LENGTH}-72 अक्षरों का पासवर्ड।`,
    );
  }
  const { name, designation, email, phone, sections, password } = parsed.data;
  const created = await server.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (!created.data.user) {
    if (created.error?.code === "email_exists" || /already/i.test(created.error?.message || ""))
      return fail("An account with this email already exists.", "ಈ ಇಮೇಲ್‌ನೊಂದಿಗೆ ಈಗಾಗಲೇ ಖಾತೆ ಇದೆ.", "इस ईमेल से पहले से एक खाता है।");
    if (created.error?.code === "weak_password")
      return fail("Choose a stronger password.", "ಇನ್ನಷ್ಟು ಬಲವಾದ ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ.", "मज़बूत पासवर्ड चुनें।");
    return fail("The account could not be created. Try again.", "ಖಾತೆ ತೆರೆಯಲು ಆಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.", "खाता नहीं बन सका। फिर कोशिश करें।");
  }
  const id = created.data.user.id;
  const { error: profileError } = await server
    .from("profiles")
    .update({ full_name: name, phone: phone || null, designation, admin_sections: sections, role: "staff" })
    .eq("id", id);
  const permissionError = profileError ? null : await writePermissions(server, id, sections);
  if (profileError || permissionError) {
    // Never leave a half-made account that can sign in.
    await server.auth.admin.deleteUser(id);
    return fail(
      "Staff access could not be saved. Run the staff accounts SQL in Supabase, then try again.",
      "ಸಿಬ್ಬಂದಿ ಪ್ರವೇಶ ಉಳಿಸಲು ಆಗಲಿಲ್ಲ. Supabase ನಲ್ಲಿ ಸಿಬ್ಬಂದಿ ಖಾತೆ SQL ರನ್ ಮಾಡಿ, ನಂತರ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
      "स्टाफ़ पहुँच सहेजी नहीं जा सकी। Supabase में स्टाफ़ अकाउंट SQL चलाएँ, फिर कोशिश करें।",
    );
  }
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function updateStaff(input: unknown): Promise<Result> {
  const parsed = updateSchema.safeParse(input);
  const access = await requireAdmin(parsed.success ? parsed.data.id : undefined);
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  if (!parsed.success)
    return fail(
      `Check the details. A new password needs ${MIN_PASSWORD_LENGTH}-72 characters; leave it empty to keep the current one.`,
      `ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ ${MIN_PASSWORD_LENGTH}-72 ಅಕ್ಷರಗಳಿರಬೇಕು; ಹಳೆಯದನ್ನೇ ಇಡಲು ಖಾಲಿ ಬಿಡಿ.`,
      `विवरण जाँचें। नया पासवर्ड ${MIN_PASSWORD_LENGTH}-72 अक्षरों का हो; पुराना रखने के लिए खाली छोड़ें।`,
    );
  const { id, name, designation, email, phone, sections, password } = parsed.data;
  if (!(await staffTarget(server, id)))
    return fail("This staff account no longer exists.", "ಈ ಸಿಬ್ಬಂದಿ ಖಾತೆ ಈಗ ಇಲ್ಲ.", "यह स्टाफ़ खाता अब नहीं है।");
  const { data: current } = await server.auth.admin.getUserById(id);
  const disabled = Boolean(current.user?.banned_until && Date.parse(current.user.banned_until) > Date.now());
  const { error: authError } = await server.auth.admin.updateUserById(id, {
    ...(current.user?.email !== email ? { email, email_confirm: true } : {}),
    ...(password ? { password } : {}),
    user_metadata: { ...(current.user?.user_metadata || {}), full_name: name },
  });
  if (authError)
    return fail(
      authError.code === "email_exists" ? "Another account already uses this email." : "The sign-in details could not be updated.",
      authError.code === "email_exists" ? "ಈ ಇಮೇಲ್ ಅನ್ನು ಇನ್ನೊಂದು ಖಾತೆ ಬಳಸುತ್ತಿದೆ." : "ಲಾಗಿನ್ ವಿವರಗಳನ್ನು ನವೀಕರಿಸಲು ಆಗಲಿಲ್ಲ.",
      authError.code === "email_exists" ? "यह ईमेल दूसरा खाता इस्तेमाल कर रहा है।" : "लॉगिन विवरण अपडेट नहीं हो सके।",
    );
  const { error: profileError } = await server
    .from("profiles")
    .update({ full_name: name, phone: phone || null, designation, admin_sections: sections })
    .eq("id", id);
  const permissionError = profileError ? null : await writePermissions(server, id, disabled ? null : sections);
  if (profileError || permissionError)
    return fail("Staff access could not be saved.", "ಸಿಬ್ಬಂದಿ ಪ್ರವೇಶ ಉಳಿಸಲು ಆಗಲಿಲ್ಲ.", "स्टाफ़ पहुँच सहेजी नहीं जा सकी।");
  revalidatePath("/admin/staff");
  return { ok: true };
}

/** Disabling blocks sign-in and removes every permission at once. */
export async function setStaffActive(id: unknown, active: unknown): Promise<Result> {
  const parsed = idSchema.safeParse(id);
  const access = await requireAdmin(parsed.success ? parsed.data : undefined);
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const target = parsed.success ? await staffTarget(server, parsed.data) : null;
  if (!target || typeof active !== "boolean")
    return fail("This staff account no longer exists.", "ಈ ಸಿಬ್ಬಂದಿ ಖಾತೆ ಈಗ ಇಲ್ಲ.", "यह स्टाफ़ खाता अब नहीं है।");
  const { error } = await server.auth.admin.updateUserById(target.id, {
    ban_duration: active ? "none" : DISABLED_FOR,
  });
  const permissionError = error ? null : await writePermissions(server, target.id, active ? target.admin_sections || [] : null);
  if (error || permissionError)
    return fail("The account could not be updated.", "ಖಾತೆಯನ್ನು ನವೀಕರಿಸಲು ಆಗಲಿಲ್ಲ.", "खाता अपडेट नहीं हो सका।");
  revalidatePath("/admin/staff");
  return { ok: true };
}

export async function deleteStaff(id: unknown): Promise<Result> {
  const parsed = idSchema.safeParse(id);
  const access = await requireAdmin(parsed.success ? parsed.data : undefined);
  if ("denied" in access) return access.denied;
  const { server, fail } = access;
  const target = parsed.success ? await staffTarget(server, parsed.data) : null;
  if (!target)
    return fail("This staff account no longer exists.", "ಈ ಸಿಬ್ಬಂದಿ ಖಾತೆ ಈಗ ಇಲ್ಲ.", "यह स्टाफ़ खाता अब नहीं है।");
  const { error } = await server.auth.admin.deleteUser(target.id);
  if (error)
    return fail(
      "This account has written or edited content, so it cannot be deleted. Disable it instead.",
      "ಈ ಖಾತೆ ವಿಷಯವನ್ನು ಬರೆದಿದೆ ಅಥವಾ ಸಂಪಾದಿಸಿದೆ, ಆದ್ದರಿಂದ ಅಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿ.",
      "इस खाते ने सामग्री लिखी या बदली है, इसलिए इसे हटाया नहीं जा सकता। इसके बजाय निष्क्रिय करें।",
    );
  revalidatePath("/admin/staff");
  return { ok: true };
}
