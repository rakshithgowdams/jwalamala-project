"use client";
import { useState } from "react";
import { manageJob } from "@/app/admin/jobs/actions";
export function JobControls({
  id,
  status,
  kind,
}: {
  id: string;
  status: string;
  kind: string;
}) {
  const [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  if (!["pending", "failed"].includes(status)) return null;
  async function run(action: "retry" | "cancel") {
    setBusy(true);
    try {
      const r = await manageJob({ id, action, checked });
      setMessage(r.error || "Saved");
    } catch {
      setMessage("Could not update job");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      {status === "failed" && kind !== "article-audio" && (
        <label className="poll-option">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          I checked the provider; this delivery was not sent.
        </label>
      )}
      {status === "failed" && (
        <button
          className="chip"
          disabled={busy || (kind !== "article-audio" && !checked)}
          onClick={() => run("retry")}
        >
          Retry
        </button>
      )}
      <button className="chip" disabled={busy} onClick={() => run("cancel")}>
        Cancel
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
