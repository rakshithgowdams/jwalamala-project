import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/lib/supabase/admin";
import { validateChatBody } from "@/lib/chat/message";
import { broadcastChatMessage } from "@/lib/chat/broadcast";

export const runtime = "nodejs";

/**
 * External systems post text/URL into a staff chat group.
 *
 * POST /api/chat/webhook
 * Authorization: Bearer <CHAT_WEBHOOK_SECRET>
 * Body: { "roomId": "<uuid>", "body": "text or https://…", "senderName": "optional" }
 */
export async function POST(request: Request) {
  const secret = process.env.CHAT_WEBHOOK_SECRET;
  if (!secret)
    return NextResponse.json({ error: "Chat webhook is not configured." }, { status: 503 });

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || token !== secret)
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = z
    .object({
      roomId: z.uuid(),
      body: z.string().max(4000),
      senderName: z.string().trim().max(80).optional(),
    })
    .safeParse(json);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Expected { roomId, body, senderName? } with text or an http(s) URL." },
      { status: 400 },
    );

  const checked = validateChatBody(parsed.data.body);
  if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });

  const server = getAdminClient();
  if (!server) return NextResponse.json({ error: "Server key missing." }, { status: 503 });

  const { data: room } = await server
    .from("chat_rooms")
    .select("id")
    .eq("id", parsed.data.roomId)
    .maybeSingle();
  if (!room) return NextResponse.json({ error: "Group not found." }, { status: 404 });

  const label = parsed.data.senderName || "Webhook";
  const { data, error } = await server
    .from("chat_messages")
    .insert({
      room_id: parsed.data.roomId,
      sender_id: null,
      sender_label: label,
      body: checked.body,
      kind: checked.kind,
    })
    .select("id,room_id,sender_id,sender_label,body,kind,created_at")
    .single();
  if (error || !data)
    return NextResponse.json({ error: error?.message || "Insert failed." }, { status: 500 });

  await server
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", parsed.data.roomId);

  const message = {
    id: data.id as string,
    roomId: data.room_id as string,
    senderId: null,
    senderName: (data.sender_label as string) || label,
    body: data.body as string,
    kind: data.kind as "text" | "url" | "system",
    createdAt: data.created_at as string,
  };
  await broadcastChatMessage(message);
  return NextResponse.json({ ok: true, message });
}
