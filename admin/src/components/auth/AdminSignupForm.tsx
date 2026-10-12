"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { PasswordField } from "./PasswordField";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import {
  requestAdminSignup,
  resendAdminCode,
  verifyAdminSignup,
} from "@/app/auth/admin/signup/actions";

export function AdminSignupForm({
  configured,
  problems = [],
}: {
  configured: boolean;
  problems?: string[];
}) {
  const [step, setStep] = useState<"details" | "code" | "done">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [approver, setApprover] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    setSuccess(false);
    try {
      await task();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function submitDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) {
      setMessage("The two passwords do not match.");
      return;
    }
    void run(async () => {
      const result = await requestAdminSignup({ name, email, password });
      if (!result.ok) return setMessage(result.error || "");
      setPassword("");
      setConfirm("");
      setApprover(result.approver || "");
      setStep("code");
    });
  }

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const result = await verifyAdminSignup(code);
      if (!result.ok) return setMessage(result.error || "");
      setStep("done");
    });
  }

  const resend = () =>
    run(async () => {
      const result = await resendAdminCode();
      setSuccess(result.ok);
      setMessage(result.ok ? "A new code has been sent." : result.error || "");
      setCode("");
    });

  return (
    <div className="admin-auth-card">
      <div className="admin-auth-badge">
        <UserPlus size={28} aria-hidden="true" />
      </div>
      {step === "details" && (
        <>
          <h1>Create Admin Account</h1>
          <p>
            New admin accounts need approval. After you submit, a 6-digit code
            is emailed to the site owner.
          </p>
          {!configured && (
            <div className="admin-auth-notice" role="status">
              Admin sign-up is not set up yet.
              {problems.length > 0 && (
                <ul className="admin-auth-problems">
                  {problems.map((problem) => (
                    <li key={problem}>{problem}</li>
                  ))}
                  <li>Fix these in admin/.env.local, then restart the admin app.</li>
                </ul>
              )}
            </div>
          )}
          <form onSubmit={submitDetails} aria-busy={busy}>
            <label className="field" htmlFor="admin-name">
              Full name
              <input
                id="admin-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={100}
                disabled={!configured || busy}
              />
            </label>
            <label className="field" htmlFor="admin-email">
              Email
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!configured || busy}
              />
            </label>
            <PasswordField
              label={`Password (at least ${MIN_PASSWORD_LENGTH} characters)`}
              value={password}
              onChange={setPassword}
              disabled={!configured || busy}
              isNew
              hint={false}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm password"
              value={confirm}
              onChange={setConfirm}
              disabled={!configured || busy}
              isNew
              hint={false}
            />
            <button disabled={!configured || busy} className="button admin-auth-submit">
              {busy ? "Please wait..." : "Request Admin Access"}
            </button>
          </form>
        </>
      )}
      {step === "code" && (
        <>
          <h1>Enter Approval Code</h1>
          <p>
            We emailed a 6-digit code to the site owner at {approver}. Ask them
            for the code and enter it here. It expires in 10 minutes.
          </p>
          <form onSubmit={submitCode} aria-busy={busy}>
            <label className="field" htmlFor="admin-code">
              Approval code
              <input
                id="admin-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                disabled={busy}
              />
            </label>
            <button disabled={busy || code.length !== 6} className="button admin-auth-submit">
              {busy ? "Please wait..." : "Verify and Create Account"}
            </button>
          </form>
        </>
      )}
      {step === "done" && (
        <>
          <h1>Account Approved</h1>
          <p>Your admin account is ready. Sign in with your email and password.</p>
          <Link href="/auth/admin" className="button admin-auth-submit">
            Go to Admin Login
          </Link>
        </>
      )}
      {message && (
        <p className={`admin-auth-message ${success ? "success" : ""}`} role="status">
          {message}
        </p>
      )}
      <div className="admin-auth-links">
        {step === "code" ? (
          <button type="button" disabled={busy} onClick={resend}>
            Send a new code
          </button>
        ) : null}
        {step !== "done" && <Link href="/auth/admin">Already an admin? Sign in</Link>}
      </div>
    </div>
  );
}
