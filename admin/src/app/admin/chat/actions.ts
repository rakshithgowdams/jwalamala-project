"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { validateChatBody } from "@/lib/chat/message";
import { broadcastChatMessage } from "@/lib/chat/broadcast";

type Result = { ok?: true; error?: string; id?: string };

async function gate() {
  const [{ user, profile }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const fail = (en: string, kn: string, hi: string): Result => ({ error: tr({ en, kn, hi }) as string });
  const server = getAdminClient();
  if (!server)
    return {
      denied: fail(
        "Chat needs the server key in admin/.env.local.",
        "ಚಾಟ್‌ಗೆ admin/.env.local ನಲ್ಲಿ ಸರ್ವರ್ ಕೀ ಬೇಕು.",
        "चैट के लिए admin/.env.local में सर्वर कुंजी चाहिए।",
      ) as Result,
    };
  return { server, user, profile, fail, isAdmin: profile.role === "admin" };
}

const nameSchema = z.string().trim().min(1).max(80);
const descSchema = z.string().trim().max(240).optional().default("");
const uuid = z.uuid();

export async function createChatRoom(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  if (!isAdmin)
    return fail("Only administrators can create groups.", "ಗುಂಪುಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ರಚಿಸಬಹುದು.", "केवल एडमिन समूह बना सकते हैं।");
  const parsed = z.object({ name: nameSchema, description: descSchema }).safeParse(input);
  if (!parsed.success)
    return fail("Enter a group name.", "ಗುಂಪಿನ ಹೆಸರು ನಮೂದಿಸಿ.", "समूह का नाम दर्ज करें।");
  const { data, error } = await server
    .from("chat_rooms")
    .insert({
      name: parsed.data.name,
      description: parsed.data.description || null,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error || !data)
    return fail(error?.message || "Could not create the group.", "ಗುಂಪು ರಚಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "समूह नहीं बन सका।");
  await server.from("chat_room_members").upsert({ room_id: data.id, user_id: user.id });
  revalidatePath("/admin/chat");
  return { ok: true, id: data.id as string };
}

export async function setChatMembers(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail, isAdmin } = access;
  if (!isAdmin)
    return fail("Only administrators can change members.", "ಸದಸ್ಯರನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಬದಲಾಯಿಸಬಹುದು.", "केवल एडमिन सदस्य बदल सकते हैं।");
  const parsed = z
    .object({ roomId: uuid, memberIds: z.array(uuid).max(200) })
    .safeParse(input);
  if (!parsed.success)
    return fail("Pick a group and staff members.", "ಗುಂಪು ಮತ್ತು ಸಿಬ್ಬಂದಿ ಆಯ್ಕೆಮಾಡಿ.", "समूह और स्टाफ़ चुनें।");
  const { roomId, memberIds } = parsed.data;
  const { data: room } = await server.from("chat_rooms").select("id").eq("id", roomId).maybeSingle();
  if (!room) return fail("Group not found.", "ಗುಂಪು ಸಿಗಲಿಲ್ಲ.", "समूह नहीं मिला।");

  const unique = [...new Set(memberIds)];
  if (unique.length) {
    const { data: staff } = await server
      .from("profiles")
      .select("id,role")
      .in("id", unique);
    const allowed = new Set(
      (staff || [])
        .filter((row) => row.role === "staff" || row.role === "admin")
        .map((row) => row.id as string),
    );
    for (const id of unique) {
      if (!allowed.has(id))
        return fail("Only staff or admin accounts can join chat.", "ಚಾಟ್‌ಗೆ ಸಿಬ್ಬಂದಿ ಅಥವಾ ನಿರ್ವಾಹಕರು ಮಾತ್ರ.", "चैट में केवल स्टाफ़ या एडमिन।");
    }
  }

  await server.from("chat_room_members").delete().eq("room_id", roomId);
  if (unique.length) {
    const { error } = await server
      .from("chat_room_members")
      .insert(unique.map((user_id) => ({ room_id: roomId, user_id })));
    if (error)
      return fail(error.message || "Could not update members.", "ಸದಸ್ಯರನ್ನು ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "सदस्य अपडेट नहीं हो सके।");
  }
  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function sendChatMessage(input: unknown): Promise<Result & { message?: Record<string, unknown> }> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, profile, fail, isAdmin } = access;
  const parsed = z
    .object({ roomId: uuid, body: z.string().max(4000), id: uuid.optional() })
    .safeParse(input);
  if (!parsed.success)
    return fail("Enter a message.", "ಸಂದೇಶ ನಮೂದಿಸಿ.", "संदेश दर्ज करें।");
  const checked = validateChatBody(parsed.data.body);
  if (!checked.ok) return fail(checked.error, checked.error, checked.error);

  if (!isAdmin) {
    const { data: membership } = await server
      .from("chat_room_members")
      .select("user_id")
      .eq("room_id", parsed.data.roomId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership)
      return fail("You are not in this group.", "ನೀವು ಈ ಗುಂಪಿನಲ್ಲಿ ಇಲ್ಲ.", "आप इस समूह में नहीं हैं।");
  }

  const row = {
    ...(parsed.data.id ? { id: parsed.data.id } : {}),
    room_id: parsed.data.roomId,
    sender_id: user.id,
    sender_label: profile.full_name || null,
    body: checked.body,
    kind: checked.kind,
  };
  const { data, error } = await server
    .from("chat_messages")
    .insert(row)
    .select("id,room_id,sender_id,sender_label,body,kind,created_at")
    .single();
  if (error || !data)
    return fail(error?.message || "Could not send the message.", "ಸಂದೇಶ ಕಳುಹಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "संदेश नहीं भेजा जा सका।");

  await server
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", parsed.data.roomId);

  const message = {
    id: data.id as string,
    roomId: data.room_id as string,
    senderId: (data.sender_id as string) || null,
    senderName: (data.sender_label as string) || "Staff",
    body: data.body as string,
    kind: data.kind as "text" | "url" | "system",
    createdAt: data.created_at as string,
  };
  await broadcastChatMessage(message);
  return { ok: true, id: message.id, message };
}

export async function loadChatMessages(roomId: string, before?: string) {
  const access = await gate();
  if ("denied" in access) return { error: access.denied.error, messages: [] as never[] };
  const { server, user, isAdmin, fail } = access;
  const id = uuid.safeParse(roomId);
  if (!id.success) return { error: fail("Invalid group.", "ಅಮಾನ್ಯ ಗುಂಪು.", "अमान्य समूह।").error, messages: [] };

  if (!isAdmin) {
    const { data: membership } = await server
      .from("chat_room_members")
      .select("user_id")
      .eq("room_id", id.data)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership)
      return { error: fail("You are not in this group.", "ನೀವು ಈ ಗುಂಪಿನಲ್ಲಿ ಇಲ್ಲ.", "आप इस समूह में नहीं हैं।").error, messages: [] };
  }

  let q = server
    .from("chat_messages")
    .select("id,room_id,sender_id,sender_label,body,kind,created_at")
    .eq("room_id", id.data)
    .order("created_at", { ascending: false })
    .limit(80);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) return { error: error.message, messages: [] };
  return {
    messages: (data || [])
      .map((row) => ({
        id: row.id as string,
        roomId: row.room_id as string,
        senderId: (row.sender_id as string) || null,
        senderName: (row.sender_label as string) || "Staff",
        body: row.body as string,
        kind: row.kind as "text" | "url" | "system",
        createdAt: row.created_at as string,
      }))
      .reverse(),
  };
}
