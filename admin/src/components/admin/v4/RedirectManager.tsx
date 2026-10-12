"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveRedirect, removeRedirect } from "@/app/admin/redirects/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function RedirectManager({
  rows,
}: {
  rows: { old_path: string; new_path: string }[];
}) {
  const { v4: t, tr } = useUiStrings();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  const oldPath = tr({ en: "Old path", kn: "ಹಳೆಯ ವಿಳಾಸ", hi: "पुराना पथ" }),
    destination = tr({ en: "Destination", kn: "ಹೊಸ ವಿಳಾಸ", hi: "नया पथ" });
  return (
    <>
      <h1>
        {tr({
          en: "301 redirects",
          kn: "301 ಮರುನಿರ್ದೇಶನಗಳು",
          hi: "301 रीडायरेक्ट",
        })}
      </h1>
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
            setMessage(r.error || t.saved);
            if (!r.error) {
              form.reset();
              router.refresh();
            }
          } catch {
            setMessage(
              tr({
                en: "Save failed",
                kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ",
                hi: "सहेजा नहीं जा सका",
              }),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {oldPath}
          <input name="old_path" placeholder="/old-story" required />
        </label>
        <label className="field">
          {destination}
          <input name="new_path" placeholder="/news/new-story" required />
        </label>
        <button className="button" disabled={busy}>
          {tr({
            en: "Save redirect",
            kn: "ಮರುನಿರ್ದೇಶನ ಉಳಿಸಿ",
            hi: "रीडायरेक्ट सहेजें",
          })}
        </button>
        <p role="status">{message}</p>
      </form>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{oldPath}</th>
              <th>{destination}</th>
              <th>{tr({ en: "Action", kn: "ಕ್ರಿಯೆ", hi: "कार्रवाई" })}</th>
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
                        setMessage(
                          tr({
                            en: "Delete failed",
                            kn: "ಅಳಿಸಲಾಗಲಿಲ್ಲ",
                            hi: "हटाया नहीं जा सका",
                          }),
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {t.remove}
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
