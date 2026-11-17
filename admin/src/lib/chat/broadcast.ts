import "server-only";

export type ChatBroadcastPayload = {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  kind: "text" | "url" | "system";
  createdAt: string;
};

export type ChatRoomSyncPayload = {
  event: "room:sync";
  roomId: string;
  name: string;
  description: string;
  memberIds: string[];
  updatedAt: string;
  removed?: boolean;
};

async function postInternal(body: Record<string, unknown>) {
  const base = (process.env.CHAT_SOCKET_INTERNAL_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
  const secret = process.env.CHAT_INTERNAL_SECRET || process.env.CHAT_WEBHOOK_SECRET;
  if (!secret) return;
  try {
    await fetch(`${base}/internal/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // Live fan-out is optional; the database remains the source of truth.
  }
}

/** Push a persisted message to the Socket.IO companion (best-effort). */
export async function broadcastChatMessage(payload: ChatBroadcastPayload) {
  await postInternal(payload as unknown as Record<string, unknown>);
}

/** Push live room create/member changes to connected desks. */
export async function broadcastChatRoomSync(payload: ChatRoomSyncPayload) {
  await postInternal(payload as unknown as Record<string, unknown>);
}
