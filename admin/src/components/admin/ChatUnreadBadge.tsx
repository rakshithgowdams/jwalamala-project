"use client";

export function ChatUnreadBadge({
  count,
  className = "",
  label = "unread messages",
}: {
  count: number;
  className?: string;
  label?: string;
}) {
  if (count <= 0) return null;
  return (
    <span className={"chat-unread-badge " + className} aria-label={`${count} ${label}`}>
      <span className="chat-unread-badge-value">{count > 99 ? "99+" : count}</span>
    </span>
  );
}
