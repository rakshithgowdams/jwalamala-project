"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRedirect, removeRedirect } from "@/app/admin/redirects/actions";
export function RedirectManager({
  rows,
}: {
  rows: { old_path: string; new_path: string }[];
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <>
      <h1>301 redirects</h1>
      <form
        className="v4-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          setBusy(true);
          try {
            const r = await saveRedirect(
              Object.fromEntries(new FormData(form)),
            );
            setMessage(r.error || "Saved");
            if (!r.error) {
              form.reset();
              router.refresh();
            }
          } catch {
            setMessage("Save failed");
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Old path
          <input name="old_path" placeholder="/old-story" required />
        </label>
        <label className="field">
          Destination
          <input name="new_path" placeholder="/news/new-story" required />
        </label>
        <button className="button" disabled={busy}>
          Save redirect
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Old path</th>
              <th>Destination</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.old_path}>
                <td>{r.old_path}</td>
                <td>{r.new_path}</td>
                <td>
                  <button
                    className="chip"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await removeRedirect(r.old_path);
                        router.refresh();
                      } catch {
                        setMessage("Delete failed");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
