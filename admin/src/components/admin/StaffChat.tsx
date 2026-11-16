"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { io, type Socket } from "socket.io-client";
import { Link2, MessageSquarePlus, Send, Users } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
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
  createChatRoom,
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

export type ChatRoom = {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  updatedAt: string;
};

export type ChatStaff = { id: string; name: string };

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  body: string;
  kind: "text" | "url" | "system";
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  userId: string;
  userName: string;
  rooms: ChatRoom[];
  staff: ChatStaff[];
  socketUrl: string;
  webhookPath: string;
};

export function StaffChat({
  isAdmin,
  userId,
  userName,
  rooms: initialRooms,
  staff,
  socketUrl,
  webhookPath,
}: Props) {
  const { tr } = useUiStrings();
  const [rooms, setRooms] = useState(initialRooms);
  const [activeId, setActiveId] = useState(initialRooms[0]?.id || "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const [status, setStatus] = useState<{ error?: string; ok?: string }>({});
  const [socketLive, setSocketLive] = useState(false);
  const [dbLive, setDbLive] = useState(false);
  const live = socketLive || dbLive;
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");
  const [typers, setTypers] = useState<Record<string, { name: string; at: number }>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const threadRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingEmitRef = useRef(0);
  const seenIdsRef = useRef(new Set<string>());
  const roomsRef = useRef(rooms);
  roomsRef.current = rooms;
  const socketLiveRef = useRef(socketLive);
  socketLiveRef.current = socketLive;

  const active = useMemo(() => rooms.find((r) => r.id === activeId) || null, [rooms, activeId]);
  const typingLabel = useMemo(() => {
    const names = Object.values(typers).map((t) => t.name);
    if (!names.length) return "";
    if (names.length === 1)
      return tr({
        en: `${names[0]} is typing`,
        kn: `${names[0]} ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
        hi: `${names[0]} टाइप कर रहे हैं`,
      });
    if (names.length === 2)
      return tr({
        en: `${names[0]} and ${names[1]} are typing`,
        kn: `${names[0]} ಮತ್ತು ${names[1]} ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
        hi: `${names[0]} और ${names[1]} टाइप कर रहे हैं`,
      });
    return tr({
      en: `${names[0]} and ${names.length - 1} others are typing`,
      kn: `${names[0]} ಮತ್ತು ಇನ್ನೂ ${names.length - 1} ಜನ ಟೈಪ್ ಮಾಡುತ್ತಿದ್ದಾರೆ`,
      hi: `${names[0]} और ${names.length - 1} अन्य टाइप कर रहे हैं`,
    });
  }, [typers, tr]);

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
  }, []);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  function ingestMessage(payload: ChatMessage, opts?: { silentSelf?: boolean }) {
    if (!payload?.id || !payload.roomId) return;
    if (seenIdsRef.current.has(payload.id)) return;
    seenIdsRef.current.add(payload.id);
    if (seenIdsRef.current.size > 400) {
      seenIdsRef.current = new Set([...seenIdsRef.current].slice(-200));
    }

    const fromSelf = payload.senderId === userId;
    const viewing = payload.roomId === activeIdRef.current;

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
    } else if (!fromSelf) {
      setUnread((current) => ({
        ...current,
        [payload.roomId]: (current[payload.roomId] || 0) + 1,
      }));
    }

    if (!fromSelf) {
      playChatNotifySound();
      const roomName = roomsRef.current.find((r) => r.id === payload.roomId)?.name || "Chat";
      const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
      if (hidden || !viewing) {
        showChatDesktopNotification({
          title: `${payload.senderName} · ${roomName}`,
          body: payload.body,
          tag: `chat-${payload.roomId}`,
          onClick: () => setActiveId(payload.roomId),
        });
      }
    } else if (!opts?.silentSelf) {
      /* no-op for self echoes */
    }
  }

  useEffect(() => {
    setTypers({});
    setUnread((current) => {
      if (!activeId || !current[activeId]) return current;
      const next = { ...current };
      delete next[activeId];
      return next;
    });
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
      auth: { userId, name: userName },
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
    socket.on("typing:start", (payload: { roomId?: string; userId?: string; name?: string }) => {
      if (!payload?.userId || payload.userId === userId) return;
      if (payload.roomId !== activeIdRef.current) return;
      setTypers((current) => ({
        ...current,
        [payload.userId!]: { name: payload.name || "Staff", at: Date.now() },
      }));
    });
    socket.on("typing:stop", (payload: { roomId?: string; userId?: string }) => {
      if (!payload?.userId) return;
      if (payload.roomId && payload.roomId !== activeIdRef.current) return;
      setTypers((current) => {
        if (!current[payload.userId!]) return current;
        const next = { ...current };
        delete next[payload.userId!];
        return next;
      });
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketLive(false);
    };
  }, [socketUrl, userId, userName]);

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

  function emitTyping(roomId: string) {
    const socket = socketRef.current;
    if (!socket || !socketLiveRef.current) return;
    const now = Date.now();
    if (now - lastTypingEmitRef.current > 250) {
      lastTypingEmitRef.current = now;
      socket.emit("typing:start", roomId);
    }
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      socket.emit("typing:stop", roomId);
    }, 900);
  }

  function stopTyping(roomId: string) {
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
    socketRef.current?.emit("typing:stop", roomId);
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
        unlockChatSound();
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
        {notifyPerm === "default" ? (
          <button
            type="button"
            className="button button-ghost staff-chat-notify-btn"
            onClick={() => {
              void ensureChatNotificationPermission().then((ok) => {
                setNotifyPerm(ok ? "granted" : chatNotificationPermission());
              });
            }}
          >
            {tr({
              en: "Enable message notifications",
              kn: "ಸಂದೇಶ ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
              hi: "संदेश सूचनाएँ चालू करें",
            })}
          </button>
        ) : null}
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
                <span className="staff-chat-room-title">
                  <strong>{room.name}</strong>
                  {count ? (
                    <span className="staff-chat-unread" aria-label={`${count} unread`}>
                      {count > 99 ? "99+" : count}
                    </span>
                  ) : null}
                </span>
                <small>
                  {room.memberIds.length}{" "}
                  {tr({ en: "members", kn: "ಸದಸ್ಯರು", hi: "सदस्य" })}
                </small>
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
          <form
            className="staff-chat-create"
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
                  }
                  return result;
                },
                tr({ en: "Group created.", kn: "ಗುಂಪು ರಚಿಸಲಾಯಿತು.", hi: "समूह बना।" }),
              );
            }}
          >
            <h3>
              <MessageSquarePlus size={16} aria-hidden="true" />
              {tr({ en: "New group", kn: "ಹೊಸ ಗುಂಪು", hi: "नया समूह" })}
            </h3>
            <label className="field">
              <span>{tr({ en: "Name", kn: "ಹೆಸರು", hi: "नाम" })}</span>
              <input value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={80} required />
            </label>
            <label className="field">
              <span>{tr({ en: "Purpose", kn: "ಉದ್ದೇಶ", hi: "उद्देश्य" })}</span>
              <input value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} maxLength={240} />
            </label>
            <button type="submit" className="button button-ember" disabled={pending || !groupName.trim()}>
              {tr({ en: "Create group", kn: "ಗುಂಪು ರಚಿಸಿ", hi: "समूह बनाएँ" })}
            </button>
          </form>
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
              <div>
                <h2>{active.name}</h2>
                {active.description ? <p>{active.description}</p> : null}
              </div>
              <p className="staff-chat-hint">
                <Link2 size={14} aria-hidden="true" />
                {tr({
                  en: "Text and web links only — no images or videos.",
                  kn: "ಪಠ್ಯ ಮತ್ತು ವೆಬ್ ಲಿಂಕ್‌ಗಳು ಮಾತ್ರ — ಚಿತ್ರ/ವೀಡಿಯೊ ಇಲ್ಲ.",
                  hi: "केवल टेक्स्ट और वेब लिंक — चित्र/वीडियो नहीं।",
                })}
              </p>
            </header>

            {isAdmin ? (
              <details className="staff-chat-settings">
                <summary>
                  {tr({
                    en: "Group settings · members & webhook",
                    kn: "ಗುಂಪು ಸೆಟ್ಟಿಂಗ್ · ಸದಸ್ಯರು ಮತ್ತು ವೆಬ್‌ಹುಕ್",
                    hi: "समूह सेटिंग · सदस्य और वेबहुक",
                  })}
                </summary>
                <div className="staff-chat-members">
                  <h3>{tr({ en: "Members", kn: "ಸದಸ್ಯರು", hi: "सदस्य" })}</h3>
                  <div className="staff-chat-member-grid">
                    {staff.map((person) => {
                      const checked = memberIds.includes(person.id);
                      return (
                        <label key={person.id} className="staff-chat-member">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setMemberIds((current) =>
                                checked ? current.filter((id) => id !== person.id) : [...current, person.id],
                              )
                            }
                          />
                          <span>{person.name}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() =>
                      run(async () => {
                        const result = await setChatMembers({ roomId: active.id, memberIds });
                        if (result.ok) {
                          setRooms((current) =>
                            current.map((room) =>
                              room.id === active.id ? { ...room, memberIds: [...memberIds] } : room,
                            ),
                          );
                        }
                        return result;
                      }, tr({ en: "Members updated.", kn: "ಸದಸ್ಯರು ನವೀಕರಿಸಲಾಯಿತು.", hi: "सदस्य अपडेट हुए।" }))
                    }
                  >
                    {tr({ en: "Save members", kn: "ಸದಸ್ಯರನ್ನು ಉಳಿಸಿ", hi: "सदस्य सहेजें" })}
                  </button>
                  <div className="staff-chat-webhook">
                    <strong>
                      {tr({ en: "Webhook for this group", kn: "ಈ ಗುಂಪಿನ ವೆಬ್‌ಹುಕ್", hi: "इस समूह का वेबहुक" })}
                    </strong>
                    <p>
                      {tr({
                        en: "POST text or a URL into this group from another system.",
                        kn: "ಬೇರೆ ವ್ಯವಸ್ಥೆಯಿಂದ ಈ ಗುಂಪಿಗೆ ಪಠ್ಯ ಅಥವಾ URL ಕಳುಹಿಸಿ.",
                        hi: "दूसरे सिस्टम से इस समूह में टेक्स्ट या URL भेजें।",
                      })}
                    </p>
                    <code>{webhookPath}</code>
                    <pre>{`Authorization: Bearer <CHAT_WEBHOOK_SECRET>
Content-Type: application/json

{
  "roomId": "${active.id}",
  "body": "Desk update https://example.com/story",
  "senderName": "Automation"
}`}</pre>
                  </div>
                </div>
              </details>
            ) : null}

            <div className="staff-chat-body">
              {status.error ? <p role="alert">{status.error}</p> : null}
              {status.ok ? <p role="status">{status.ok}</p> : null}
              <div className="staff-chat-thread" ref={threadRef} aria-live="polite">
                {messages.map((msg) => (
                  <article
                    key={msg.id}
                    className={
                      "staff-chat-bubble is-enter" +
                      (msg.senderId === userId ? " is-mine" : "") +
                      (msg.kind === "system" ? " is-system" : "")
                    }
                  >
                    <header>
                      <strong>{msg.senderName}</strong>
                      <time dateTime={msg.createdAt}>
                        {new Intl.DateTimeFormat("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        }).format(new Date(msg.createdAt))}
                      </time>
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
                  </article>
                ))}
                {typingLabel ? (
                  <div className="staff-chat-typing" aria-live="polite">
                    <span className="staff-chat-typing-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                    <span>{typingLabel}</span>
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
                unlockChatSound();
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
    </div>
  );
}
