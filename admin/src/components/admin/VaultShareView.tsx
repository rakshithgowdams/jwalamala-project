"use client";
import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyShareFields({
  siteUrl,
  email,
  password,
  notes,
}: {
  siteUrl: string;
  email: string;
  password: string;
  notes: string;
}) {
  const [status, setStatus] = useState("");

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} copied`);
    } catch {
      setStatus("Could not copy");
    }
  }

  return (
    <div className="vault-share-fields">
      <label>
        <span>Site link</span>
        <div className="vault-share-row">
          <a href={siteUrl} target="_blank" rel="noopener noreferrer">
            {siteUrl}
          </a>
          <button type="button" onClick={() => copy("Site", siteUrl)}>
            <Copy size={14} /> Copy
          </button>
        </div>
      </label>
      <label>
        <span>Email / username</span>
        <div className="vault-share-row">
          <code>{email || "—"}</code>
          <button type="button" disabled={!email} onClick={() => copy("Email", email)}>
            <Copy size={14} /> Copy
          </button>
        </div>
      </label>
      <label>
        <span>Password</span>
        <div className="vault-share-row">
          <code>{password}</code>
          <button type="button" onClick={() => copy("Password", password)}>
            <Copy size={14} /> Copy
          </button>
        </div>
      </label>
      {notes ? (
        <label>
          <span>Notes</span>
          <p>{notes}</p>
        </label>
      ) : null}
      {status ? <p role="status">{status}</p> : null}
    </div>
  );
}
