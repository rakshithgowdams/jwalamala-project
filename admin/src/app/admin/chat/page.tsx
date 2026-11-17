import { requireStaff } from "@/lib/auth/require-user";
import { getAdminClient } from "@/lib/supabase/admin";
import { getUiStrings } from "@/lib/i18n/server";
import { getChatWebhookSecretStatus } from "@/lib/chat/webhook-secret";
import { StaffChat, type ChatRoom } from "@/components/admin/StaffChat";

export default async function ChatPage() {
  const [{ user, profile, db }, { tr }] = await Promise.all([requireStaff(), getUiStrings()]);
  const isAdmin = profile.role === "admin";
  const server = getAdminClient() || db;
  const webhookStatus = isAdmin ? await getChatWebhookSecretStatus(getAdminClient() || server) : undefined;

  const staffRes = isAdmin
    ? await server.from("profiles").select("id,full_name,role").in("role", ["staff", "admin"]).order("full_name")
    : { data: [] as { id: string; full_name: string | null; role: string }[] };

  let rooms: ChatRoom[] = [];
  const roomsQuery = isAdmin
    ? server.from("chat_rooms").select("id,name,description,updated_at").order("updated_at", { ascending: false })
    : server
        .from("chat_rooms")
        .select("id,name,description,updated_at,chat_room_members!inner(user_id)")
        .eq("chat_room_members.user_id", user.id)
        .order("updated_at", { ascending: false });

  const { data: roomRows, error: roomsError } = await roomsQuery;
  if (roomsError) {
    return (
      <>
        <div className="section-title">
          <h1>{tr({ en: "Chat", kn: "ಚಾಟ್", hi: "चैट" })}</h1>
        </div>
        <p role="alert">
          {tr({
            en: "Staff chat is not set up yet. Run supabase/migrations/20261116160000_staff_chat.sql in the Supabase SQL Editor for project aukaaveugptginqbpwwb, then reload.",
            kn: "ಸಿಬ್ಬಂದಿ ಚಾಟ್ ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ. aukaaveugptginqbpwwb ಪ್ರಾಜೆಕ್ಟ್‌ನ SQL Editor ನಲ್ಲಿ supabase/migrations/20261116160000_staff_chat.sql ರನ್ ಮಾಡಿ.",
            hi: "स्टाफ़ चैट अभी सेट नहीं है। प्रोजेक्ट aukaaveugptginqbpwwb के SQL Editor में supabase/migrations/20261116160000_staff_chat.sql चलाएँ।",
          })}
        </p>
      </>
    );
  }

  const roomIds = (roomRows || []).map((row) => row.id as string);
  const membersByRoom = new Map<string, string[]>();
  if (roomIds.length) {
    const { data: memberRows } = await server
      .from("chat_room_members")
      .select("room_id,user_id")
      .in("room_id", roomIds);
    for (const row of memberRows || []) {
      const list = membersByRoom.get(row.room_id as string) || [];
      list.push(row.user_id as string);
      membersByRoom.set(row.room_id as string, list);
    }
  }

  rooms = (roomRows || []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || "",
    memberIds: membersByRoom.get(row.id as string) || [],
    updatedAt: row.updated_at as string,
  }));

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001").replace(/\/$/, "");
  const socketUrl = process.env.NEXT_PUBLIC_CHAT_SOCKET_URL || "http://127.0.0.1:3002";

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Chat", kn: "ಚಾಟ್", hi: "चैट" })}</h1>
      </div>
      <StaffChat
        isAdmin={isAdmin}
        userId={user.id}
        userName={profile.full_name || "Staff"}
        userRole={profile.role === "admin" ? "admin" : "staff"}
        rooms={rooms}
        staff={(staffRes.data || []).map((row) => ({
          id: row.id as string,
          name: (row.full_name as string) || (row.id as string),
          role: row.role === "admin" ? ("admin" as const) : ("staff" as const),
        }))}
        socketUrl={socketUrl}
        webhookPath={`${siteUrl}/api/chat/webhook`}
        webhookStatus={webhookStatus}
      />
    </>
  );
}
