"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  playChatNotifySound,
  showChatDesktopNotification,
  unlockChatSound,
} from "@/lib/chat/notify";

/**
 * Lives in the admin shell so staff/admins still hear chat alerts when they
 * leave /admin/chat for another feature or switch browser tabs.
 */
export function StaffChatNotifier({ userId }: { userId: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!userId) return;
    const supabase = getBrowserClient();
    if (!supabase) return;

    const onFirstGesture = () => unlockChatSound();
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });

    const channel = supabase
      .channel(`staff-chat-notify:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const row = payload.new as {
            id?: string;
            room_id?: string;
            sender_id?: string | null;
            sender_label?: string | null;
            body?: string;
          };
          if (!row?.id || !row.room_id) return;
          if (row.sender_id && row.sender_id === userId) return;

          // Chat page owns in-room alerts; this covers every other admin screen.
          if (pathnameRef.current.startsWith("/admin/chat")) return;

          playChatNotifySound();
          const title = `${row.sender_label || "Staff"} · Chat`;
          showChatDesktopNotification({
            title,
            body: row.body || "New message",
            tag: `chat-${row.room_id}`,
            onClick: () => router.push("/admin/chat"),
          });
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
