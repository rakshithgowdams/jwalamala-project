"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/config/site";
import { ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { PasswordField } from "./PasswordField";
import { isAuthRateLimited, submitEmailAuth } from "@/lib/auth/email";
import type { AuthMethods } from "@/lib/auth/settings";
import { adminReturnPath } from "@/lib/auth/paths";

export function AdminLoginForm({ next = "/admin", authError, methods }: {
  next?: string;
  authError?: string;
  methods: AuthMethods;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(authError === "access"
    ? "This account does not have administrator access. Contact your site administrator."
    : authError ? "This sign-in link could not be verified. Please try again." : "");
  const [success, setSuccess] = useState(false);
  const configured = methods.available && methods.email;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !configured) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      const db = getBrowserClient();
      if (!db) throw new Error("Unavailable");
      const result = await submitEmailAuth(db.auth, {
        mode, email, password, next: adminReturnPath(next),
        // Password resets finish on the news site, which owns /auth/callback and /account/password.
        origin: mode === "reset" ? site.url : window.location.origin,
      });
      setPassword("");
      if (result === "reset-sent") {
        setSuccess(true);
        setMessage("If an account exists with that email, a password reset link has been sent.");
        return;
      }
      const { data: allowed, error } = await db.rpc("has_permission", { requested: "admin.access" });
      if (error) {
        setMessage("We could not check your access. Please try again.");
        return;
      }
      if (allowed !== true) {
        setMessage("This account does not have administrator access. Contact your site administrator.");
        return;
      }
      router.replace(adminReturnPath(next));
      router.refresh();
    } catch (error) {
      setMessage(isAuthRateLimited(error)
        ? "Too many attempts. Please wait a few minutes."
        : mode === "login" ? "Unable to sign in. Check your email and password and confirm your email address."
        : "Could not send the reset link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-auth-card">
    <div className="admin-auth-badge"><ShieldCheck size={28} aria-hidden="true" /></div>
    <h1>{mode === "reset" ? "Reset Password" : "Admin Login"}</h1>
    <p>{mode === "reset" ? "Enter your email to receive a password reset link."
      : "Sign in with an account authorized by your site administrator."}</p>
    {!configured && <div className="admin-auth-notice" role="status">Administrator sign-in is temporarily unavailable.</div>}
    <form onSubmit={submit} aria-busy={busy}>
      <label className="field" htmlFor="admin-email">Email
        <input id="admin-email" name="email" type="email" autoComplete="email"
          autoCapitalize="none" spellCheck={false} placeholder="admin@example.com"
          value={email} onChange={(event) => setEmail(event.target.value)} required disabled={!configured || busy} />
      </label>
      {mode === "login" && <PasswordField label="Password" value={password} onChange={setPassword} disabled={!configured || busy} />}
      <button disabled={!configured || busy} className="button admin-auth-submit">
        {busy ? "Please wait..." : mode === "reset" ? "Send Reset Link" : "Sign In"}
      </button>
      {message && <p className={`admin-auth-message ${success ? "success" : ""}`} role="status">{message}</p>}
    </form>
    <div className="admin-auth-links">
      <button type="button" disabled={busy} onClick={() => {
        setMode(mode === "login" ? "reset" : "login"); setPassword(""); setMessage("");
      }}>{mode === "login" ? "Forgot password?" : "Back to Login"}</button>
      <a href={site.url}>Back to the news site</a>
    </div>
  </div>;
}
