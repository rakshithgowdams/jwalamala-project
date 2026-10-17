"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AuthMethods } from "@/lib/auth/settings";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { getBrowserClient } from "@/lib/supabase/client";
import { safeReturnPath } from "@/lib/utils/dates";
import {
  authCallbackUrl,
  submitEmailAuth,
  isAuthRateLimited,
  MIN_PASSWORD_LENGTH,
  type EmailMode,
} from "@/lib/auth/email";
import { PasswordField } from "./PasswordField";

import { site } from "@/config/site";

export function LoginForm({
  next,
  authError = false,
  initialMode = "login",
  methods,
}: {
  next: string;
  authError?: boolean;
  initialMode?: EmailMode;
  methods: AuthMethods;
}) {
  const { kn } = useUiStrings();
  const router = useRouter();

  const [method, setMethod] = useState<"email" | "phone">(methods.email || !methods.phone ? "email" : "phone");
  const [mode, setMode] = useState<EmailMode>(initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>(
    authError ? kn.authLinkFailed : "",
  );
  const configured = methods.available && (method === "email" ? methods.email : methods.phone);
  const canSubmit = configured && (mode !== "signup" || methods.signup);

  function changeMode(value: EmailMode) {
    setMode(value);
    setPassword("");
    setConfirm("");
    setMessage("");
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !canSubmit) return;
    setBusy(true);
    setMessage("");
    try {
      const db = getBrowserClient();
      if (!db) {
        setMessage(kn.unavailable);
        return;
      }
      if (method === "email") {
        if (mode === "signup" && password.length < MIN_PASSWORD_LENGTH) {
          setMessage(kn.passwordHint);
          return;
        }
        if (mode === "signup" && password !== confirm) {
          setMessage(kn.passwordMismatch);
          return;
        }
        const result = await submitEmailAuth(db.auth, {
          mode,
          email,
          password,
          origin: window.location.origin,
          next,
          fullName,
        });
        setPassword("");
        setConfirm("");
        if (result === "signed-in") {
          router.replace(safeReturnPath(next));
          router.refresh();
        }
        else
          setMessage(
            result === "reset-sent" ? kn.resetSent : kn.confirmEmailSent,
          );
      } else {
        const normalized = phone.replace(/\s/g, "");
        if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
          setMessage(kn.validation);
          return;
        }
        if (sent) {
          const { error } = await db.auth.verifyOtp({
            phone: normalized,
            token: otp,
            type: "sms",
          });
          if (error) throw error;
          router.replace(safeReturnPath(next));
          router.refresh();
        } else {
          const { error } = await db.auth.signInWithOtp({ phone: normalized });
          if (error) throw error;
          setSent(true);
          setMessage(kn.otpSent);
        }
      }
    } catch (error) {
      setMessage(
        isAuthRateLimited(error)
          ? kn.rateLimited
          : method === "email" && mode !== "login"
            ? kn.authRequestFailed
            : kn.loginFailed,
      );
    } finally {
      setBusy(false);
    }
  }
  async function googleLogin() {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const db = getBrowserClient();
      if (!db) {
        setMessage(kn.unavailable);
        setBusy(false);
        return;
      }
      const { data, error } = await db.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authCallbackUrl(window.location.origin, next),
          skipBrowserRedirect: true,
          queryParams: { prompt: "select_account" },
        },
      });
      if (error || !data.url) throw error || new Error("OAuth URL missing");
      window.location.assign(data.url);
    } catch {
      setMessage(kn.googleLoginFailed);
      setBusy(false);
    }
  }
  return (
    <div className="auth-card">
      <Image src={site.logo} alt="" width={80} height={80} />
      <h1>{mode === "signup" ? kn.createAccount : kn.loginTitle}</h1>
      <p>{kn.loginDescription}</p>
      {!configured && (
        <div className="notice" role="status">
          {kn.unavailable}
        </div>
      )}
      {methods.google && <button
        type="button"
        className="button button-outline google-login"
        disabled={!methods.available || busy}
        onClick={googleLogin}
      >
        <span className="google-mark" aria-hidden="true">
          G
        </span>
        {kn.google}
      </button>}
      {methods.google && (methods.email || methods.phone) && <div className="auth-divider">
        <span>{kn.or}</span>
      </div>}
      {methods.email && methods.phone && <div className="auth-methods" role="group" aria-label={kn.loginMethod}>
        {(["email", "phone"] as const).map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={method === value}
            disabled={busy}
            onClick={() => {
              setMethod(value);
              setMessage("");
              setPassword("");
              setConfirm("");
            }}
          >
            {value === "email" ? kn.emailLogin : kn.phoneLogin}
          </button>
        ))}
      </div>}
      <form onSubmit={submit} aria-busy={busy}>
        {method === "email" ? (
          <>
            <h2 className="auth-form-title">
              {mode === "signup"
                ? kn.createAccount
                : mode === "reset"
                  ? kn.forgotPassword
                  : kn.emailLogin}
            </h2>
            <label className="field" htmlFor="email">
              {kn.email}
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="name@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!configured || busy}
              />
            </label>
            {mode === "signup" && <label className="field" htmlFor="full-name">
              {kn.name}
              <input id="full-name" name="name" autoComplete="name" value={fullName}
                onChange={(event) => setFullName(event.target.value)} maxLength={100}
                required disabled={!canSubmit || busy} />
            </label>}
            {mode !== "reset" && (
              <>
                <PasswordField
                  value={password}
                  onChange={setPassword}
                  isNew={mode === "signup"}
                  disabled={!configured || busy}
                />
                {mode === "signup" && (
                  <PasswordField
                    id="confirm-password"
                    label={kn.confirmPassword}
                    value={confirm}
                    onChange={setConfirm}
                    isNew
                    disabled={!configured || busy}
                  />
                )}
                <p className="auth-hint">{kn.appPasswordHint}</p>
              </>
            )}
            <button
              disabled={!canSubmit || busy}
              className="button button-ember"
            >
              {busy
                ? kn.pleaseWait
                : mode === "signup"
                  ? kn.createAccount
                  : mode === "reset"
                    ? kn.sendReset
                    : kn.login}
            </button>
            <div className="auth-links">
              {mode === "login" ? (
                <>
                  {(methods.signup || !methods.available) && <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeMode("signup")}
                  >
                    {kn.createAccount}
                  </button>}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeMode("reset")}
                  >
                    {kn.forgotPassword}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => changeMode("login")}
                >
                  {kn.backToLogin}
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <label className="field">
              {kn.phone}
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                disabled={sent || !configured || busy}
              />
              <span className="meta">{kn.phoneHint}</span>
            </label>
            {sent && (
              <label className="field">
                {kn.otp}
                <input
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  required
                  disabled={busy}
                />
              </label>
            )}
            <button
              disabled={!configured || busy}
              className="button button-ember"
            >
              {busy ? kn.pleaseWait : sent ? kn.verify : kn.sendOtp}
            </button>
            {sent && (
              <button
                type="button"
                className="button button-outline"
                disabled={busy}
                onClick={() => {
                  setSent(false);
                  setOtp("");
                  setMessage("");
                }}
              >
                {kn.changePhone}
              </button>
            )}
          </>
        )}
        {message && (
          <p className="form-message" role="status">
            {message}
          </p>
        )}
      </form>
      <Link className="skip" href="/">
        {kn.skip}
      </Link>
    </div>
  );
}
