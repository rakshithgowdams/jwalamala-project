"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewContributor } from "@/app/account/contribute/actions";
export function ContributorReviews({
  rows,
}: {
  rows: { user_id: string; note: string; status: string; place_id: string }[];
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter();
  return (
    <>
      <p role="status">{message}</p>
      {rows.map((r) => (
        <article className="utility-panel" key={r.user_id}>
          <p>
            {r.user_id} · {r.status}
          </p>
          <p>{r.note}</p>
          <p>Assigned place: {r.place_id}</p>
          {(["approved", "rejected"] as const).map((decision) => (
            <button
              key={decision}
              className="chip"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await reviewContributor(r.user_id, decision);
                  setMessage(result.error || "Saved");
                  router.refresh();
                } catch {
                  setMessage("Review failed");
                } finally {
                  setBusy(false);
                }
              }}
            >
              {decision === "approved"
                ? "Approve contributor"
                : "Reject / revoke approval"}
            </button>
          ))}
        </article>
      ))}
    </>
  );
}
