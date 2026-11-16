"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { validateChatBody } from "@/lib/chat/message";
import { broadcastChatMessage, broadcastChatRoomSync } from "@/lib/chat/broadcast";
import {
  CHAT_WEBHOOK_SETTINGS_KEY,
  createChatWebhookSecret,
  getChatWebhookSecretStatus,
  type ChatWebhookSecretStatus,
} from "@/lib/chat/webhook-secret";

type Result = { ok?: true; error?: string; id?: string };
type AdminClient = NonNullable<ReturnType<typeof getAdminClient>>;

function formatPeopleList(names: string[]) {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

async function loadProfileNames(server: AdminClient, ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const { data } = await server.from("profiles").select("id,full_name").in("id", ids);
  const map = new Map<string, string>();
  for (const row of data || []) {
    map.set(row.id as string, ((row.full_name as string) || "").trim() || "Staff");
  }
  return map;
}

async function postSystemMessage(
  server: AdminClient,
  roomId: string,
  body: string,
  actor: { id: string; name: string },
) {
  const { data } = await server
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: actor.id,
      sender_label: actor.name,
      body,
      kind: "system",
    })
    .select("id,room_id,sender_id,sender_label,body,kind,created_at")
    .single();
  if (!data) return null;

  const updatedAt = new Date().toISOString();
  await server.from("chat_rooms").update({ updated_at: updatedAt }).eq("id", roomId);

  const message = {
    id: data.id as string,
    roomId: data.room_id as string,
    senderId: (data.sender_id as string) || null,
    senderName: (data.sender_label as string) || "System",
    body: data.body as string,
    kind: "system" as const,
    createdAt: data.created_at as string,
  };
  await broadcastChatMessage(message);
  return { message, updatedAt };
}

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
  const { server, user, profile, fail, isAdmin } = access;
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

  const actorName = (profile.full_name || "").trim() || "Admin";
  const posted = await postSystemMessage(server, data.id as string, `${actorName} created this group`, {
    id: user.id,
    name: actorName,
  });
  const updatedAt = posted?.updatedAt || new Date().toISOString();
  await broadcastChatRoomSync({
    event: "room:sync",
    roomId: data.id as string,
    name: parsed.data.name,
    description: parsed.data.description || "",
    memberIds: [user.id],
    updatedAt,
  });

  revalidatePath("/admin/chat");
  return { ok: true, id: data.id as string };
}

export async function setChatMembers(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, profile, fail, isAdmin } = access;
  if (!isAdmin)
    return fail("Only administrators can change members.", "ಸದಸ್ಯರನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಬದಲಾಯಿಸಬಹುದು.", "केवल एडमिन सदस्य बदल सकते हैं।");
  const parsed = z
    .object({ roomId: uuid, memberIds: z.array(uuid).max(200) })
    .safeParse(input);
  if (!parsed.success)
    return fail("Pick a group and staff members.", "ಗುಂಪು ಮತ್ತು ಸಿಬ್ಬಂದಿ ಆಯ್ಕೆಮಾಡಿ.", "समूह और स्टाफ़ चुनें।");
  const { roomId, memberIds } = parsed.data;
  const { data: room } = await server
    .from("chat_rooms")
    .select("id,name,description")
    .eq("id", roomId)
    .maybeSingle();
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

  const { data: existingMembers } = await server
    .from("chat_room_members")
    .select("user_id")
    .eq("room_id", roomId);
  const before = new Set((existingMembers || []).map((row) => row.user_id as string));
  const after = new Set(unique);
  const addedIds = unique.filter((id) => !before.has(id));
  const removedIds = [...before].filter((id) => !after.has(id));

  await server.from("chat_room_members").delete().eq("room_id", roomId);
  if (unique.length) {
    const { error } = await server
      .from("chat_room_members")
      .insert(unique.map((user_id) => ({ room_id: roomId, user_id })));
    if (error)
      return fail(error.message || "Could not update members.", "ಸದಸ್ಯರನ್ನು ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "सदस्य अपडेट नहीं हो सके।");
  }

  const actorName = (profile.full_name || "").trim() || "Admin";
  const nameIds = [...new Set([user.id, ...addedIds, ...removedIds])];
  const names = await loadProfileNames(server, nameIds);
  names.set(user.id, actorName);

  let updatedAt = new Date().toISOString();
  if (addedIds.length) {
    const posted = await postSystemMessage(
      server,
      roomId,
      `${actorName} added ${formatPeopleList(addedIds.map((id) => names.get(id) || "Staff"))}`,
      { id: user.id, name: actorName },
    );
    if (posted) updatedAt = posted.updatedAt;
  }
  if (removedIds.length) {
    const posted = await postSystemMessage(
      server,
      roomId,
      `${actorName} removed ${formatPeopleList(removedIds.map((id) => names.get(id) || "Staff"))}`,
      { id: user.id, name: actorName },
    );
    if (posted) updatedAt = posted.updatedAt;
  }

  await broadcastChatRoomSync({
    event: "room:sync",
    roomId,
    name: room.name as string,
    description: (room.description as string) || "",
    memberIds: unique,
    updatedAt,
  });

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

export async function deleteChatMessage(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  const parsed = z.object({ messageId: uuid, roomId: uuid }).safeParse(input);
  if (!parsed.success)
    return fail("Message not found.", "ಸಂದೇಶ ಸಿಗಲಿಲ್ಲ.", "संदेश नहीं मिला।");

  const { data: row } = await server
    .from("chat_messages")
    .select("id,sender_id,room_id")
    .eq("id", parsed.data.messageId)
    .eq("room_id", parsed.data.roomId)
    .maybeSingle();
  if (!row) return fail("Message not found.", "ಸಂದೇಶ ಸಿಗಲಿಲ್ಲ.", "संदेश नहीं मिला।");

  if (!isAdmin && row.sender_id !== user.id)
    return fail(
      "You can only delete your own messages.",
      "ನೀವು ನಿಮ್ಮ ಸಂದೇಶಗಳನ್ನು ಮಾತ್ರ ಅಳಿಸಬಹುದು.",
      "आप केवल अपने संदेश हटा सकते हैं।",
    );

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

  const { error } = await server.from("chat_messages").delete().eq("id", parsed.data.messageId);
  if (error)
    return fail(error.message || "Could not delete the message.", "ಸಂದೇಶ ಅಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "संदेश नहीं हटाया जा सका।");
  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function deleteChatRoom(input: unknown): Promise<Result> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail, isAdmin } = access;
  if (!isAdmin)
    return fail(
      "Only administrators can delete groups.",
      "ಗುಂಪುಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಅಳಿಸಬಹುದು.",
      "केवल एडमिन समूह हटा सकते हैं।",
    );
  const parsed = z.object({ roomId: uuid }).safeParse(input);
  if (!parsed.success) return fail("Group not found.", "ಗುಂಪು ಸಿಗಲಿಲ್ಲ.", "समूह नहीं मिला।");

  const { data: room } = await server
    .from("chat_rooms")
    .select("id,name,description")
    .eq("id", parsed.data.roomId)
    .maybeSingle();
  if (!room) return fail("Group not found.", "ಗುಂಪು ಸಿಗಲಿಲ್ಲ.", "समूह नहीं मिला।");

  await broadcastChatRoomSync({
    event: "room:sync",
    roomId: parsed.data.roomId,
    name: room.name as string,
    description: (room.description as string) || "",
    memberIds: [],
    updatedAt: new Date().toISOString(),
    removed: true,
  });

  const { error } = await server.from("chat_rooms").delete().eq("id", parsed.data.roomId);
  if (error)
    return fail(error.message || "Could not delete the group.", "ಗುಂಪು ಅಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.", "समूह नहीं हटाया जा सका।");
  revalidatePath("/admin/chat");
  return { ok: true };
}

export async function fetchChatRoom(roomId: string) {
  const access = await gate();
  if ("denied" in access) return { error: access.denied.error, room: null as null };
  const { server, user, isAdmin, fail } = access;
  const id = uuid.safeParse(roomId);
  if (!id.success) return { error: fail("Invalid group.", "ಅಮಾನ್ಯ ಗುಂಪು.", "अमान्य समूह।").error, room: null };

  if (!isAdmin) {
    const { data: membership } = await server
      .from("chat_room_members")
      .select("user_id")
      .eq("room_id", id.data)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!membership) return { room: null };
  }

  const { data: room } = await server
    .from("chat_rooms")
    .select("id,name,description,updated_at")
    .eq("id", id.data)
    .maybeSingle();
  if (!room) return { room: null };

  const { data: members } = await server
    .from("chat_room_members")
    .select("user_id")
    .eq("room_id", id.data);

  return {
    room: {
      id: room.id as string,
      name: room.name as string,
      description: (room.description as string) || "",
      memberIds: (members || []).map((row) => row.user_id as string),
      updatedAt: room.updated_at as string,
    },
  };
}

export async function fetchChatWebhookSecretStatus(): Promise<
  ChatWebhookSecretStatus & { error?: string }
> {
  const access = await gate();
  if ("denied" in access) return { configured: false, source: "none", hint: null, rotatedAt: null, error: access.denied.error };
  const { server, isAdmin, fail } = access;
  if (!isAdmin)
    return {
      configured: false,
      source: "none",
      hint: null,
      rotatedAt: null,
      error: fail(
        "Only administrators can manage the webhook secret.",
        "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ಅನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ನಿರ್ವಹಿಸಬಹುದು.",
        "वेबहुक सीक्रेट केवल एडमिन प्रबंधित कर सकते हैं।",
      ).error,
    };
  return getChatWebhookSecretStatus(server);
}

export async function rotateChatWebhookSecret(): Promise<
  Result & { secret?: string; status?: ChatWebhookSecretStatus }
> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, user, fail, isAdmin } = access;
  if (!isAdmin)
    return fail(
      "Only administrators can generate the webhook secret.",
      "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ಅನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ರಚಿಸಬಹುದು.",
      "वेबहुक सीक्रेट केवल एडमिन बना सकते हैं।",
    );

  const { secret, hint, hash } = createChatWebhookSecret();
  const rotatedAt = new Date().toISOString();
  const { error } = await server.from("site_settings").upsert({
    key: CHAT_WEBHOOK_SETTINGS_KEY,
    value: {
      secret_hash: hash,
      hint,
      rotated_at: rotatedAt,
      rotated_by: user.id,
    },
  });
  if (error)
    return fail(
      error.message || "Could not save the webhook secret.",
      "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ಉಳಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
      "वेबहुक सीक्रेट सहेजा नहीं जा सका।",
    );

  revalidatePath("/admin/chat");
  return {
    ok: true,
    secret,
    status: {
      configured: true,
      source: process.env.CHAT_WEBHOOK_SECRET?.trim() ? "both" : "database",
      hint,
      rotatedAt,
    },
  };
}

export async function revokeChatWebhookSecret(): Promise<Result & { status?: ChatWebhookSecretStatus }> {
  const access = await gate();
  if ("denied" in access) return access.denied;
  const { server, fail, isAdmin } = access;
  if (!isAdmin)
    return fail(
      "Only administrators can revoke the webhook secret.",
      "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ಅನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ರದ್ದುಮಾಡಬಹುದು.",
      "वेबहुक सीक्रेट केवल एडमिन रद्द कर सकते हैं।",
    );

  const { error } = await server.from("site_settings").delete().eq("key", CHAT_WEBHOOK_SETTINGS_KEY);
  if (error)
    return fail(
      error.message || "Could not revoke the webhook secret.",
      "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ರದ್ದುಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
      "वेबहुक सीक्रेट रद्द नहीं हो सका।",
    );

  revalidatePath("/admin/chat");
  return { ok: true, status: await getChatWebhookSecretStatus(server) };
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
