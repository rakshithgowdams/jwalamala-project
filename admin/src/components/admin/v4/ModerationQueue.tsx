"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { moderateSubmission } from "@/app/admin/v4/actions";
import { v4 as t } from "@/content/strings.kn";
export function ModerationQueue({
  rows,
}: {
  rows: {
    id: string;
    kind: string;
    status: string;
    payload: Record<string, unknown>;
  }[];
}) {
  const [busy, setBusy] = useState(""),
    [message, setMessage] = useState("");
  const router = useRouter();
  async function review(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try {
      const result = await moderateSubmission(id, decision);
      setMessage(result.error || t.saved);
      if (!result.error) router.refresh();
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy("");
    }
  }
  return (
    <>
      <p role="status">{message}</p>
      {rows.map((row) => (
        <article className="utility-panel" key={row.id}>
          <span className="eyebrow">
            {row.kind} · {row.status}
          </span>
          <h2>{String(row.payload.title_kn || "")}</h2>
          <p>{String(row.payload.body_kn || "")}</p>
          <p className="meta">
            {String(row.payload.name || "")} · {String(row.payload.email || "")}
          </p>
          {row.status === "pending" && (
            <div className="auth-links">
              <button
                className="button button-ember"
                disabled={!!busy}
                onClick={() => void review(row.id, "approved")}
              >
                {t.approve}
              </button>
              <button
                className="button button-outline"
                disabled={!!busy}
                onClick={() => void review(row.id, "rejected")}
              >
                {t.reject}
              </button>
            </div>
          )}
        </article>
      ))}
    </>
  );
}
