"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { io, type Socket } from "socket.io-client";
import { CircleAlert, MessageSquarePlus, Send, Settings2, Trash2, Users } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ChatGroupSettingsModal } from "@/components/admin/ChatGroupSettingsModal";
import { linkify, validateChatBody } from "@/lib/chat/message";
import {
  chatNotificationPermission,
  ensureChatNotificationPermission,
  playChatNotifySound,
  showChatDesktopNotification,
  unlockChatSound,
} from "@/lib/chat/notify";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  bumpChatUnread,
  clearChatUnread,
  getChatUnreadMap,
  subscribeChatUnread,
} from "@/lib/chat/unread";
import { ChatUnreadBadge } from "@/components/admin/ChatUnreadBadge";
import {
  createChatRoom,
  deleteChatMessage,
  deleteChatRoom,
  fetchChatRoom,
  loadChatMessages,
  sendChatMessage,
  setChatMembers,
} from "@/app/admin/chat/actions";

function mapDbMessage(row: {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_label: string | null;
  body: string;
  kind: string;
  created_at: string;
}): ChatMessage {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    senderName: row.sender_label || "Staff",
    body: row.body,
    kind: row.kind === "url" || row.kind === "system" ? row.kind : "text",
    createdAt: row.created_at,
  };
}

const CHAT_TZ = "Asia/Kolkata";

function chatDayKey(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CHAT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function chatMessageTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CHAT_TZ,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

function shiftDayKey(key: string, days: number) {
  const [year, month, day] = key.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
}

function chatDayLabel(
  iso: string,
  tr: (value: { en: string; kn: string; hi: string }) => string,
) {
  const key = chatDayKey(iso);
  const today = chatDayKey(new Date().toISOString());
  const yesterday = shiftDayKey(today, -1);

  if (key === today) return tr({ en: "Today", kn: "ಇಂದು", hi: "आज" });
  if (key === yesterday) return tr({ en: "Yesterday", kn: "ನಿನ್ನೆ", hi: "कल" });
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: CHAT_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export type ChatRoom = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  updatedAt: string;
};

export type ChatStaff = { id: string; name: string; role: "admin" | "staff" };

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  kind: "text" | "url" | "system";
  createdAt: string;
};

type WebhookStatus = {
  configured: boolean;
  source: "database" | "env" | "both" | "none";
  hint: string | null;
  rotatedAt: string | null;
};

type TyperInfo = { name: string; role: "admin" | "staff"; at: number };

type Props = {
  isAdmin: boolean;
  userId: string;
  userName: string;
  userRole: "admin" | "staff";
  rooms: ChatRoom[];
  staff: ChatStaff[];
  socketUrl: string;
  webhookPath: string;
  webhookStatus?: WebhookStatus;
};

export function StaffChat({
  isAdmin,
  userId,
  userName,
  userRole,
  rooms: initialRooms,
  staff,
  socketUrl,
  webhookPath,
  webhookStatus,
}: Props) {
  const { tr } = useUiStrings();
  const [rooms, setRooms] = useState(initialRooms);
  const [activeId, setActiveId] = useState(initialRooms[0]?.id || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ChatMessage | null>(null);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: string }>({});
  const [socketLive, setSocketLive] = useState(false);
  const [dbLive, setDbLive] = useState(false);
  const live = socketLive || dbLive;
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");
  const [typers, setTypers] = useState<Record<string, TyperInfo>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typingChannelRef = useRef<any>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);
  const seenIdsRef = useRef(new Set<string>());
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const socketLiveRef = useRef(socketLive);
  socketLiveRef.current = socketLive;
  const staffByIdRef = useRef(new Map(staff.map((person) => [person.id, person])));
  staffByIdRef.current = new Map(staff.map((person) => [person.id, person]));

  const active = useMemo(() => rooms.find((r) => r.id === activeId) || null, [rooms, activeId]);
  const roleLabel = (role: "admin" | "staff") =>
    role === "admin"
      ? tr({ en: "Super Admin", kn: "ಸೂಪರ್ ಅಡ್ಮಿನ್", hi: "सुपर एडमिन" })
      : tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" });
  const typingPeople = useMemo(() => Object.values(typers), [typers]);
  const typingLabel = useMemo(() => {
    if (!typingPeople.length) return "";
    const formatPerson = (person: TyperInfo) => `${person.name} · ${roleLabel(person.role)}`;
    if (typingPeople.length === 1)
      return tr({
        en: `${formatPerson(typingPeople[0])} is typing`,
        kn: `${formatPerson(typingPeople[0])} ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
        hi: `${formatPerson(typingPeople[0])} टाइप कर रहे हैं`,
      });
    if (typingPeople.length === 2)
      return tr({
        en: `${formatPerson(typingPeople[0])} and ${formatPerson(typingPeople[1])} are typing`,
        kn: `${formatPerson(typingPeople[0])} ಮತ್ತು ${formatPerson(typingPeople[1])} ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
        hi: `${formatPerson(typingPeople[0])} और ${formatPerson(typingPeople[1])} टाइप कर रहे हैं`,
      });
    return tr({
      en: `${formatPerson(typingPeople[0])} and ${typingPeople.length - 1} others are typing`,
      kn: `${formatPerson(typingPeople[0])} ಮತ್ತು ಇನ್ನೂ ${typingPeople.length - 1} ಜನ ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
      hi: `${formatPerson(typingPeople[0])} और ${typingPeople.length - 1} अन्य टाइप कर रहे हैं`,
    });
  }, [typingPeople, tr]);

  function resolveRole(userKey: string, role?: string): "admin" | "staff" {
    if (role === "admin" || role === "staff") return role;
    return staffByIdRef.current.get(userKey)?.role === "admin" ? "admin" : "staff";
  }

  function noteTyping(payload: { userId?: string; name?: string; role?: string }) {
    if (!payload?.userId || payload.userId === userId) return;
    const known = staffByIdRef.current.get(payload.userId);
    setTypers((current) => ({
      ...current,
      [payload.userId!]: {
        name: payload.name || known?.name || "Staff",
        role: resolveRole(payload.userId!, payload.role || known?.role),
        at: Date.now(),
      },
    }));
  }

  function clearTyping(userKey?: string) {
    if (!userKey) return;
    setTypers((current) => {
      if (!current[userKey]) return current;
      const next = { ...current };
      delete next[userKey];
      return next;
    });
  }

  useEffect(() => {
    setRooms(initialRooms);
    if (!activeId && initialRooms[0]) setActiveId(initialRooms[0].id);
  }, [initialRooms, activeId]);

  useEffect(() => {
    if (!active) {
      setMemberIds([]);
      return;
    }
    setMemberIds(active.memberIds);
  }, [active]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    start(async () => {
      const result = await loadChatMessages(activeId);
      if (cancelled) return;
      if (result.error) setStatus({ error: result.error });
      else {
        for (const msg of result.messages) seenIdsRef.current.add(msg.id);
        setMessages(result.messages);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  useEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "auto" });
  }, [messages.length, activeId, typingLabel]);

  useEffect(() => {
    setNotifyPerm(chatNotificationPermission());
    setUnread(getChatUnreadMap());
    return subscribeChatUnread(setUnread);
  }, []);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  function applyRoomSync(payload: {
    roomId: string;
    name: string;
    description?: string;
    memberIds: string[];
    updatedAt: string;
    removed?: boolean;
  }) {
    if (!payload?.roomId) return;
    if (payload.removed) {
      setRooms((current) => current.filter((r) => r.id !== payload.roomId));
      setUnread(clearChatUnread(payload.roomId));
      if (activeIdRef.current === payload.roomId) {
        setActiveId("");
        setMessages([]);
        setSettingsOpen(false);
      }
      return;
    }

    const canSee = isAdmin || payload.memberIds.includes(userId);
    if (!canSee) {
      setRooms((current) => current.filter((r) => r.id !== payload.roomId));
      setUnread(clearChatUnread(payload.roomId));
      if (activeIdRef.current === payload.roomId) {
        setActiveId("");
        setMessages([]);
        setSettingsOpen(false);
      }
      return;
    }

    const nextRoom: ChatRoom = {
      id: payload.roomId,
      name: payload.name,
      description: payload.description || "",
      memberIds: [...payload.memberIds],
      updatedAt: payload.updatedAt,
    };
    setRooms((current) => {
      const without = current.filter((r) => r.id !== payload.roomId);
      return [nextRoom, ...without];
    });
    if (activeIdRef.current === payload.roomId) {
      setMemberIds([...payload.memberIds]);
    }
    socketRef.current?.emit("room:join", payload.roomId);
  }

  async function ensureRoomInList(roomId: string) {
    if (roomsRef.current.some((room) => room.id === roomId)) return;
    const result = await fetchChatRoom(roomId);
    if (!result.room) return;
    setRooms((current) =>
      current.some((room) => room.id === result.room!.id) ? current : [result.room!, ...current],
    );
    socketRef.current?.emit("room:join", roomId);
  }

  function ingestMessage(payload: ChatMessage, opts?: { silentSelf?: boolean }) {
    if (!payload?.id || !payload.roomId) return;
    if (seenIdsRef.current.has(payload.id)) return;
    seenIdsRef.current.add(payload.id);
    if (seenIdsRef.current.size > 400) {
      seenIdsRef.current = new Set([...seenIdsRef.current].slice(-200));
    }

    if (!roomsRef.current.some((room) => room.id === payload.roomId)) {
      void ensureRoomInList(payload.roomId);
    }

    const fromSelf = payload.senderId === userId;
    const viewing = payload.roomId === activeIdRef.current;
    const isSystem = payload.kind === "system";

    if (viewing) {
      setTypers((current) => {
        if (!payload.senderId || !current[payload.senderId]) return current;
        const next = { ...current };
        delete next[payload.senderId];
        return next;
      });
      setMessages((current) =>
        current.some((m) => m.id === payload.id) ? current : [...current, payload],
      );
    } else if (!fromSelf && !isSystem) {
      setUnread(bumpChatUnread(payload.roomId));
    }

    if (!fromSelf && !isSystem) {
      const roomName = roomsRef.current.find((r) => r.id === payload.roomId)?.name || "Chat";
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      const away = hidden || !viewing;
      // Always chime for inbound messages so peers hear the alert reliably.
      void playChatNotifySound();
      if (away) {
        showChatDesktopNotification({
          title: `${payload.senderName} · ${roomName}`,
          body: payload.body,
          tag: `chat-${payload.roomId}`,
          onClick: () => setActiveId(payload.roomId),
        });
      }
    } else if (!opts?.silentSelf) {
      /* no-op for self echoes / system activity */
    }
  }

  useEffect(() => {
    setTypers({});
    if (activeId) setUnread(clearChatUnread(activeId));
  }, [activeId]);

  useEffect(() => {
    const total = Object.values(unread).reduce((sum, n) => sum + n, 0);
    const base = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = total ? `(${total > 99 ? "99+" : total}) ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\(\d+\+?\)\s*/, "");
    };
  }, [unread]);

  // Supabase Realtime — works across users even when Socket.IO is down (e.g. Vercel).
  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`staff-chat:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as {
            id: string;
            room_id: string;
            sender_id: string | null;
            sender_label: string | null;
            body: string;
            kind: string;
            created_at: string;
          };
          if (!row?.id || !row.room_id) return;
          ingestMessage(mapDbMessage(row), { silentSelf: true });
        },
      )
      .subscribe((status) => {
        setDbLive(status === "SUBSCRIBED");
      });
    return () => {
      setDbLive(false);
      void supabase.removeChannel(channel);
    };
    // ingestMessage closes over userId; remount when identity changes.
  }, [userId]);

  // Fallback poll only when neither socket nor Realtime is live.
  useEffect(() => {
    if (!activeId || live) return;
    let cancelled = false;
    const pull = async () => {
      const result = await loadChatMessages(activeId);
      if (cancelled || result.error) return;
      for (const msg of result.messages) ingestMessage(msg, { silentSelf: true });
    };
    const timer = window.setInterval(pull, 2000);
    void pull();
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [activeId, live]);

  useEffect(() => {
    if (!socketUrl || !userId) return;
    const socket = io(socketUrl, {
      // WebSocket first for lowest latency; polling only as fallback.
      transports: ["websocket", "polling"],
      upgrade: true,
      auth: { userId, name: userName, role: userRole },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 200,
      reconnectionDelayMax: 2000,
      timeout: 8000,
    });
    socketRef.current = socket;

    function joinAllRooms() {
      for (const room of roomsRef.current) socket.emit("room:join", room.id);
    }

    socket.on("connect", () => {
      setSocketLive(true);
      joinAllRooms();
    });
    socket.on("disconnect", () => setSocketLive(false));
    socket.on("message:new", (payload: ChatMessage) => {
      ingestMessage(payload);
    });
    socket.on("message:removed", (payload: { roomId?: string; messageId?: string }) => {
      if (!payload?.messageId) return;
      seenIdsRef.current.delete(payload.messageId);
      if (payload.roomId === activeIdRef.current) {
        setMessages((current) => current.filter((m) => m.id !== payload.messageId));
      }
    });
    socket.on(
      "room:sync",
      (payload: {
        roomId?: string;
        name?: string;
        description?: string;
        memberIds?: string[];
        updatedAt?: string;
        removed?: boolean;
      }) => {
        if (!payload?.roomId || !payload.name || !Array.isArray(payload.memberIds)) {
          if (payload?.removed && payload.roomId) {
            applyRoomSync({
              roomId: payload.roomId,
              name: "",
              memberIds: [],
              updatedAt: payload.updatedAt || new Date().toISOString(),
              removed: true,
            });
          }
          return;
        }
        applyRoomSync({
          roomId: payload.roomId,
          name: payload.name,
          description: payload.description || "",
          memberIds: payload.memberIds,
          updatedAt: payload.updatedAt || new Date().toISOString(),
          removed: payload.removed,
        });
      },
    );
    socket.on("room:removed", (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      applyRoomSync({
        roomId: payload.roomId,
        name: "",
        memberIds: [],
        updatedAt: new Date().toISOString(),
        removed: true,
      });
    });
    socket.on(
      "typing:start",
      (payload: { roomId?: string; userId?: string; name?: string; role?: string }) => {
        if (payload.roomId !== activeIdRef.current) return;
        noteTyping(payload);
      },
    );
    socket.on("typing:stop", (payload: { roomId?: string; userId?: string }) => {
      if (payload.roomId && payload.roomId !== activeIdRef.current) return;
      clearTyping(payload.userId);
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketLive(false);
    };
  }, [socketUrl, userId, userName, userRole, isAdmin]);

  // Supabase broadcast typing — works on Vercel even when Socket.IO is offline.
  useEffect(() => {
    if (!activeId || !userId) {
      typingChannelRef.current = null;
      return;
    }
    const supabase = getBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel(`chat-typing:${activeId}`, { config: { broadcast: { self: false } } })
      .on(
        "broadcast",
        { event: "typing" },
        ({ payload }: { payload: { userId?: string; name?: string; role?: string; state?: string } }) => {
          if (!payload?.userId || payload.userId === userId) return;
          if (payload.state === "stop") clearTyping(payload.userId);
          else noteTyping(payload);
        },
      )
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      typingChannelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [activeId, userId]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !socketLive) return;
    for (const room of rooms) socket.emit("room:join", room.id);
  }, [rooms, socketLive]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeId || !socketLive) return;
    socket.emit("room:join", activeId);
    return () => {
      socket.emit("typing:stop", activeId);
    };
  }, [activeId, socketLive]);

  // Drop stale typers if they stop without a stop event.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = Date.now();
      setTypers((current) => {
        let changed = false;
        const next: typeof current = {};
        for (const [id, info] of Object.entries(current)) {
          if (now - info.at < 2800) next[id] = info;
          else changed = true;
        }
        return changed ? next : current;
      });
    }, 900);
    return () => window.clearInterval(timer);
  }, []);

  function broadcastTyping(roomId: string, state: "start" | "stop") {
    const socket = socketRef.current;
    if (socket && socketLiveRef.current) {
      socket.emit(state === "start" ? "typing:start" : "typing:stop", roomId);
    }
    const channel = typingChannelRef.current;
    if (channel) {
      void channel.send({
        type: "broadcast",
        event: "typing",
        payload: {
          roomId,
          userId,
          name: userName,
          role: userRole,
          state,
        },
      });
    }
  }

  function emitTyping(roomId: string) {
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 250) {
      lastTypingEmitRef.current = now;
      broadcastTyping(roomId, "start");
    }
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      broadcastTyping(roomId, "stop");
    }, 900);
  }

  function stopTyping(roomId: string) {
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    broadcastTyping(roomId, "stop");
  }

  function run(action: () => Promise<{ ok?: true; error?: string; id?: string; message?: ChatMessage }>, done: string) {
    setStatus({});
    start(async () => {
      const result = await action();
      if (result.error) setStatus({ error: result.error });
      else {
        setStatus({ ok: done });
        if (result.message) {
          seenIdsRef.current.add(result.message.id);
          setMessages((current) =>
            current.some((m) => m.id === result.message!.id) ? current : [...current, result.message!],
          );
          socketRef.current?.emit("message:share", result.message);
        }
      }
    });
  }

  return (
    <div
      className="staff-chat"
      onPointerDown={() => {
        void unlockChatSound();
        void ensureChatNotificationPermission().then((ok) => {
          setNotifyPerm(ok ? "granted" : chatNotificationPermission());
        });
      }}
    >
      <aside className="staff-chat-sidebar">
        <div className="staff-chat-side-head">
          <h2>{tr({ en: "Groups", kn: "ಗುಂಪುಗಳು", hi: "समूह" })}</h2>
          <span className={"staff-chat-live" + (live ? " is-on" : "")}>
            {live
              ? tr({ en: "Live", kn: "ಲೈವ್", hi: "लाइव" })
              : tr({ en: "Offline", kn: "ಆಫ್‌ಲೈನ್", hi: "ऑफ़लाइन" })}
          </span>
        </div>
        <ul className="staff-chat-room-list">
          {rooms.map((room) => {
            const count = unread[room.id] || 0;
            return (
              <li key={room.id}>
                <button
                  type="button"
                  className={
                    "staff-chat-room" +
                    (room.id === activeId ? " is-active" : "") +
                    (count ? " has-unread" : "")
                  }
                  onClick={() => setActiveId(room.id)}
                >
                  <ChatUnreadBadge count={count} className="staff-chat-room-badge" />
                  <span className="staff-chat-room-avatar" aria-hidden="true">
                    {room.name.trim().charAt(0).toUpperCase() || "G"}
                  </span>
                  <span className="staff-chat-room-meta">
                    <span className="staff-chat-room-title">
                      <strong>{room.name}</strong>
                    </span>
                    <small>
                      {room.memberIds.length}{" "}
                      {tr({ en: "members", kn: "ಸದಸ್ಯರು", hi: "सदस्य" })}
                    </small>
                  </span>
                </button>
              </li>
            );
          })}
          {!rooms.length ? (
            <li className="staff-chat-empty">
              {tr({
                en: "No groups yet.",
                kn: "ಇನ್ನೂ ಗುಂಪುಗಳಿಲ್ಲ.",
                hi: "अभी कोई समूह नहीं।",
              })}
            </li>
          ) : null}
        </ul>

        {isAdmin ? (
          <div className="staff-chat-side-foot">
            <button type="button" className="button button-ember staff-chat-create-btn" onClick={() => setCreateOpen(true)}>
              <MessageSquarePlus size={16} aria-hidden="true" />
              {tr({ en: "Create group", kn: "ಗುಂಪು ರಚಿಸಿ", hi: "समूह बनाएँ" })}
            </button>
          </div>
        ) : null}
      </aside>

      <section className="staff-chat-main">
        {!active ? (
          <div className="staff-chat-blank">
            <Users size={28} aria-hidden="true" />
            <p>
              {tr({
                en: "Select a group or create one to start chatting.",
                kn: "ಚಾಟ್ ಪ್ರಾರಂಭಿಸಲು ಗುಂಪು ಆಯ್ಕೆಮಾಡಿ ಅಥವಾ ರಚಿಸಿ.",
                hi: "चैट शुरू करने के लिए समूह चुनें या बनाएँ।",
              })}
            </p>
          </div>
        ) : (
          <>
            <header className="staff-chat-main-head">
              <div className="staff-chat-main-head-text">
                <h2>{active.name}</h2>
                <p>
                  {active.memberIds.length}{" "}
                  {tr({ en: "members", kn: "ಸದಸ್ಯರು", hi: "सदस्य" })}
                  {active.description ? ` · ${active.description}` : ""}
                </p>
              </div>
              <div className="staff-chat-main-head-actions">
                <button
                  type="button"
                  className="button button-ghost staff-chat-settings-btn"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={16} aria-hidden="true" />
                  {tr({ en: "Settings", kn: "ಸೆಟ್ಟಿಂಗ್", hi: "सेटिंग" })}
                </button>
              </div>
            </header>

            <div className="staff-chat-body">
              {status.error ? <p role="alert">{status.error}</p> : null}
              {status.ok ? <p role="status">{status.ok}</p> : null}
              <div className="staff-chat-thread" ref={threadRef} aria-live="polite">
                {messages.map((msg, index) => {
                  const canDelete = isAdmin || msg.senderId === userId;
                  const dayKey = chatDayKey(msg.createdAt);
                  const prevDayKey = index > 0 ? chatDayKey(messages[index - 1].createdAt) : "";
                  const showDayDivider = dayKey !== prevDayKey;
                  return (
                    <div key={msg.id} className="staff-chat-thread-item">
                      {showDayDivider ? (
                        <div className="staff-chat-day-divider" role="separator">
                          <span>{chatDayLabel(msg.createdAt, tr)}</span>
                        </div>
                      ) : null}
                      <article
                        className={
                          "staff-chat-bubble is-enter" +
                          (msg.senderId === userId && msg.kind !== "system" ? " is-mine" : "") +
                          (msg.kind === "system" ? " is-system" : "")
                        }
                      >
                        {msg.kind === "system" ? (
                          <p>
                            <span>{msg.body}</span>
                            <time dateTime={msg.createdAt}>{chatMessageTime(msg.createdAt)}</time>
                          </p>
                        ) : (
                          <>
                            <header>
                              <strong>{msg.senderName}</strong>
                              <span className="staff-chat-bubble-meta">
                                <time dateTime={msg.createdAt}>{chatMessageTime(msg.createdAt)}</time>
                                {canDelete ? (
                                  <button
                                    type="button"
                                    className="staff-chat-msg-delete"
                                    title={tr({
                                      en: "Delete message",
                                      kn: "ಸಂದೇಶ ಅಳಿಸಿ",
                                      hi: "संदेश हटाएँ",
                                    })}
                                    aria-label={tr({
                                      en: "Delete message",
                                      kn: "ಸಂದೇಶ ಅಳಿಸಿ",
                                      hi: "संदेश हटाएँ",
                                    })}
                                    disabled={pending}
                                    onClick={() => setPendingDelete(msg)}
                                  >
                                    <Trash2 size={13} aria-hidden="true" />
                                  </button>
                                ) : null}
                              </span>
                            </header>
                            <p>
                              {msg.kind === "url" ? (
                                <a href={msg.body} target="_blank" rel="noopener noreferrer">
                                  {msg.body}
                                </a>
                              ) : (
                                linkify(msg.body).map((part, i) =>
                                  part.type === "link" ? (
                                    <a key={i} href={part.value} target="_blank" rel="noopener noreferrer">
                                      {part.value}
                                    </a>
                                  ) : (
                                    <span key={i}>{part.value}</span>
                                  ),
                                )
                              )}
                            </p>
                          </>
                        )}
                      </article>
                    </div>
                  );
                })}
                {typingLabel ? (
                  <div className="staff-chat-typing is-live" aria-live="polite">
                    <div className="staff-chat-typing-bubble" aria-hidden="true">
                      <span className="staff-chat-typing-dots">
                        <i />
                        <i />
                        <i />
                      </span>
                    </div>
                    <div className="staff-chat-typing-copy">
                      {typingPeople.length === 1 ? (
                        <>
                          <strong>{typingPeople[0].name}</strong>
                          <small className={"is-" + typingPeople[0].role}>
                            {roleLabel(typingPeople[0].role)}
                          </small>
                          <span className="staff-chat-typing-words">
                            {tr({ en: "is typing", kn: "ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ", hi: "टाइप कर रहे हैं" })}
                            <em>…</em>
                          </span>
                        </>
                      ) : (
                        <span className="staff-chat-typing-words">{typingLabel}<em>…</em></span>
                      )}
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            </div>

            <form
              className="staff-chat-composer"
              onSubmit={(e) => {
                e.preventDefault();
                const raw = draft;
                if (!raw.trim()) return;
                const checked = validateChatBody(raw);
                if (!checked.ok) {
                  setStatus({ error: checked.error });
                  return;
                }
                setDraft("");
                stopTyping(active.id);
                void unlockChatSound();
                void ensureChatNotificationPermission().then((ok) => {
                  setNotifyPerm(ok ? "granted" : chatNotificationPermission());
                });

                // Socket-first: peers see the message before DB round-trip finishes.
                const message: ChatMessage = {
                  id: crypto.randomUUID(),
                  roomId: active.id,
                  senderId: userId,
                  senderName: userName,
                  body: checked.body,
                  kind: checked.kind,
                  createdAt: new Date().toISOString(),
                };
                ingestMessage(message, { silentSelf: true });
                socketRef.current?.emit("message:share", message);

                start(async () => {
                  const result = await sendChatMessage({
                    roomId: active.id,
                    body: checked.body,
                    id: message.id,
                  });
                  if (result.error) {
                    setStatus({ error: result.error });
                    setMessages((current) => current.filter((m) => m.id !== message.id));
                    seenIdsRef.current.delete(message.id);
                  } else {
                    setStatus({
                      ok: tr({ en: "Sent.", kn: "ಕಳುಹಿಸಲಾಯಿತು.", hi: "भेजा गया।" }),
                    });
                  }
                });
              }}
            >
              <label className="sr-only" htmlFor="staff-chat-input">
                {tr({ en: "Message", kn: "ಸಂದೇಶ", hi: "संदेश" })}
              </label>
              <input
                id="staff-chat-input"
                value={draft}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft(value);
                  if (value.trim()) emitTyping(active.id);
                  else stopTyping(active.id);
                }}
                onBlur={() => stopTyping(active.id)}
                maxLength={4000}
                placeholder={tr({
                  en: "Write a message or paste an https link…",
                  kn: "ಸಂದೇಶ ಬರೆಯಿರಿ ಅಥವಾ https ಲಿಂಕ್ ಅಂಟಿಸಿ…",
                  hi: "संदेश लिखें या https लिंक पेस्ट करें…",
                })}
                autoComplete="off"
              />
              <button type="submit" className="button button-ember" disabled={!draft.trim()}>
                <Send size={16} aria-hidden="true" />
                {tr({ en: "Send", kn: "ಕಳುಹಿಸಿ", hi: "भेजें" })}
              </button>
            </form>
          </>
        )}
      </section>

      {pendingDelete && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => !pending && setPendingDelete(null)}
            >
              <div
                className="delete-dialog confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-chat-message-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="confirm-dialog-icon" aria-hidden="true">
                  <CircleAlert size={28} strokeWidth={2.25} />
                </div>
                <h2 id="delete-chat-message-title">
                  {tr({
                    en: "Are you sure?",
                    kn: "ನೀವು ಖಚಿತವೇ?",
                    hi: "क्या आप सुनिश्चित हैं?",
                  })}
                </h2>
                <p>
                  {tr({
                    en: "Are you sure you want to delete this message? This cannot be undone.",
                    kn: "ಈ ಸಂದೇಶವನ್ನು ಅಳಿಸುವುದೇ? ಇದನ್ನು ಹಿಂದಕ್ಕೆ ತೆಗೆಯಲಾಗುವುದಿಲ್ಲ.",
                    hi: "क्या आप वाकई इस संदेश को हटाना चाहते हैं? इसे वापस नहीं किया जा सकता।",
                  })}
                </p>
                <div className="confirm-dialog-preview">
                  <div>
                    <strong>{pendingDelete.senderName}</strong>
                    <small>{pendingDelete.body.slice(0, 120)}</small>
                  </div>
                </div>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setPendingDelete(null)}
                  >
                    {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={pending || !active}
                    onClick={() => {
                      const msg = pendingDelete;
                      const roomId = active?.id;
                      if (!msg || !roomId) return;
                      run(async () => {
                        const result = await deleteChatMessage({
                          messageId: msg.id,
                          roomId,
                        });
                        if (result.ok) {
                          setMessages((current) => current.filter((m) => m.id !== msg.id));
                          seenIdsRef.current.delete(msg.id);
                          socketRef.current?.emit("message:delete", {
                            roomId,
                            messageId: msg.id,
                          });
                          setPendingDelete(null);
                        }
                        return result;
                      }, tr({ en: "Message deleted.", kn: "ಸಂದೇಶ ಅಳಿಸಲಾಯಿತು.", hi: "संदेश हटाया।" }));
                    }}
                  >
                    {tr({ en: "Delete message", kn: "ಸಂದೇಶ ಅಳಿಸಿ", hi: "संदेश हटाएँ" })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {active ? (
        <ChatGroupSettingsModal
          open={settingsOpen}
          room={active}
          staff={staff}
          isAdmin={isAdmin}
          webhookPath={webhookPath}
          webhookStatus={webhookStatus}
          pending={pending}
          onClose={() => setSettingsOpen(false)}
          onSaveMembers={(ids) => {
            setMemberIds(ids);
            run(async () => {
              const result = await setChatMembers({ roomId: active.id, memberIds: ids });
              if (result.ok) {
                setRooms((current) =>
                  current.map((room) => (room.id === active.id ? { ...room, memberIds: [...ids] } : room)),
                );
                setSettingsOpen(false);
              }
              return result;
            }, tr({ en: "Members updated.", kn: "ಸದಸ್ಯರು ನವೀಕರಿಸಲಾಯಿತು.", hi: "सदस्य अपडेट हुए।" }));
          }}
          onDeleteGroup={() => {
            run(async () => {
              const result = await deleteChatRoom({ roomId: active.id });
              if (result.ok) {
                socketRef.current?.emit("room:delete", { roomId: active.id });
                setRooms((current) => current.filter((r) => r.id !== active.id));
                setSettingsOpen(false);
                setActiveId("");
                setMessages([]);
              }
              return result;
            }, tr({ en: "Community deleted.", kn: "ಸಮುದಾಯ ಅಳಿಸಲಾಯಿತು.", hi: "समुदाय हटाया।" }));
          }}
        />
      ) : null}

      {isAdmin && createOpen ? (
        <div className="staff-chat-modal-root" role="presentation" onClick={() => setCreateOpen(false)}>
          <form
            className="staff-chat-modal staff-chat-create-modal"
            role="dialog"
            aria-modal="true"
            aria-label={tr({ en: "Create group", kn: "ಗುಂಪು ರಚಿಸಿ", hi: "समूह बनाएँ" })}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              run(
                async () => {
                  const result = await createChatRoom({ name: groupName, description: groupDesc });
                  if (result.ok && result.id) {
                    setRooms((current) => [
                      {
                        id: result.id!,
                        name: groupName.trim(),
                        description: groupDesc.trim(),
                        memberIds: [userId],
                        updatedAt: new Date().toISOString(),
                      },
                      ...current,
                    ]);
                    setActiveId(result.id);
                    setGroupName("");
                    setGroupDesc("");
                    setCreateOpen(false);
                    setSettingsOpen(true);
                  }
                  return result;
                },
                tr({ en: "Group created.", kn: "ಗುಂಪು ರಚಿಸಲಾಯಿತು.", hi: "समूह बना।" }),
              );
            }}
          >
            <header className="staff-chat-modal-head">
              <div>
                <h3>{tr({ en: "Create group", kn: "ಗುಂಪು ರಚಿಸಿ", hi: "समूह बनाएँ" })}</h3>
                <p>
                  {tr({
                    en: "After creating, add members and webhook settings in the popup.",
                    kn: "ರಚಿಸಿದ ನಂತರ ಪಾಪ್‌ಅಪ್‌ನಲ್ಲಿ ಸದಸ್ಯರು ಮತ್ತು ವೆಬ್‌ಹುಕ್ ಸೆಟ್ಟಿಂಗ್ ಸೇರಿಸಿ.",
                    hi: "बनाने के बाद पॉपअप में सदस्य और वेबहुक सेटिंग जोड़ें।",
                  })}
                </p>
              </div>
              <button
                type="button"
                className="staff-chat-modal-close"
                onClick={() => setCreateOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </header>
            <div className="staff-chat-modal-body">
              <label className="field">
                <span>{tr({ en: "Name", kn: "ಹೆಸರು", hi: "नाम" })}</span>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  maxLength={80}
                  required
                  autoFocus
                />
              </label>
              <label className="field">
                <span>{tr({ en: "Purpose", kn: "ಉದ್ದೇಶ", hi: "उद्देश्य" })}</span>
                <input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} maxLength={240} />
              </label>
              <div className="staff-chat-modal-actions">
                <button type="button" className="button button-ghost" onClick={() => setCreateOpen(false)}>
                  {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
                </button>
                <button type="submit" className="button button-ember" disabled={pending || !groupName.trim()}>
                  {tr({ en: "Create group", kn: "ಗುಂಪು ರಚಿಸಿ", hi: "समूह बनाएँ" })}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
