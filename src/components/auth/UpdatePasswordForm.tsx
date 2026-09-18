"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { PasswordField } from "./PasswordField";
import { getBrowserClient } from "@/lib/supabase/client";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";

export function UpdatePasswordForm({ compact = false }: { compact?: boolean } = {}) {
  const { kn } = useUiStrings();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(kn.passwordHint);
      return;
    }
    if (password !== confirm) {
      setMessage(kn.passwordMismatch);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const db = getBrowserClient();
      if (!db) {
        setMessage(kn.unavailable);
        return;
      }
      const { error } = await db.auth.updateUser({ password });
      if (error) {
        setMessage(kn.passwordUpdateFailed);
        return;
      }
      setDone(true);
      setPassword("");
      setConfirm("");
    } catch {
      setMessage(kn.passwordUpdateFailed);
    } finally {
      setBusy(false);
    }
  }
  const content = done ? (
    <>
      <p role="status">{kn.passwordUpdated}</p>
      {!compact && (
        <Link href="/account" className="button button-ember">
          {kn.account}
        </Link>
      )}
    </>
  ) : (
    <form onSubmit={submit} aria-busy={busy}>
      <PasswordField
        value={password}
        onChange={setPassword}
        isNew
        disabled={busy}
      />
      <PasswordField
        id="confirm-password"
        label={kn.confirmPassword}
        value={confirm}
        onChange={setConfirm}
        isNew
        disabled={busy}
      />
      <button className="button button-ember" disabled={busy}>
        {busy ? kn.pleaseWait : kn.savePassword}
      </button>
      {message && (
        <p className="form-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
  if (compact) return content;
  return (
    <div className="auth-card">
      <h1>{kn.newPassword}</h1>
      {content}
    </div>
  );
}
