"use client";
import { useState } from "react";
export function ImageUpload({
  onUploaded,
  kind = "post",
}: {
  onUploaded: (url: string) => void;
  kind?: "post" | "ad";
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <label className="field">
      ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ (ಗರಿಷ್ಠ 1 MB)
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            if (file.size > 1048576) throw Error();
            const form = new FormData();
            form.set("file", file);
            form.set("kind", kind);
            const r = await fetch("/api/admin/media", {
              method: "POST",
              body: form,
            });
            if (!r.ok) throw Error();
            onUploaded((await r.json()).url);
            setMessage("ಚಿತ್ರ ಸೇರಿಸಲಾಗಿದೆ. ಚಿತ್ರ ಕೃಪೆ ನಮೂದಿಸಿ.");
          } catch {
            setMessage("ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಆಗಲಿಲ್ಲ. ಗಾತ್ರ ಮತ್ತು ಸ್ವರೂಪ ಪರಿಶೀಲಿಸಿ.");
          } finally {
            setBusy(false);
          }
        }}
      />
      <span role="status">{message}</span>
    </label>
  );
}
