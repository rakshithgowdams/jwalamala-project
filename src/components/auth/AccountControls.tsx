"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { pickText } from "@/lib/i18n/content";

import { useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { UpdatePasswordForm } from "./UpdatePasswordForm";

import type { Category } from "@/lib/types";
export function Logout() {
  const { kn } = useUiStrings();

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <div className="logout-block">
      <button
        className="button button-outline"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const db = getBrowserClient();
            if (!db) throw new Error("Unavailable");
            const { error } = await db.auth.signOut({ scope: "local" });
            if (error) throw error;
            // Drop in-memory private data along with the authenticated cookies.
            window.location.replace(new URL("/", window.location.origin).href);
          } catch {
            setMessage(kn.unavailable);
            setBusy(false);
          }
        }}
      >
        {kn.logout}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function ProfileCard({
  userId,
  fullName,
  email,
  phone,
}: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
}) {
  const { kn } = useUiStrings();

  const [value, setValue] = useState(fullName);
  const [saved, setSaved] = useState(fullName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const contact = email || phone;
  const initials =
    (value.trim() || contact || "?")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("") || "?";
  return (
    <div className="utility-panel profile-card" data-motion="off">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">
          {initials}
        </div>
        <div className="profile-header-text">
          <h2>{value.trim() || kn.name}</h2>
          {contact && <p>{contact}</p>}
        </div>
      </div>
      <form
        className="profile-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const trimmed = value.trim();
          if (!trimmed || trimmed === saved) return;
          const db = getBrowserClient();
          if (!db) return;
          setBusy(true);
          setMessage("");
          const { error } = await db
            .from("profiles")
            .update({ full_name: trimmed })
            .eq("id", userId);
          setBusy(false);
          if (error) setMessage(kn.unavailable);
          else {
            setSaved(trimmed);
            setMessage(kn.saved);
          }
        }}
      >
        <label className="field" htmlFor="profile-name">
          {kn.name}
          <input
            id="profile-name"
            value={value}
            maxLength={100}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          className="button button-outline"
          disabled={busy || !value.trim() || value.trim() === saved}
        >
          {busy ? kn.pleaseWait : kn.save}
        </button>
        {message && <p role="status">{message}</p>}
      </form>
      {email && (
        <details className="password-disclosure">
          <summary>{kn.newPassword}</summary>
          <UpdatePasswordForm compact />
        </details>
      )}
      <div className="profile-footer">
        <Logout />
      </div>
    </div>
  );
}
export function Interests({
  userId,
  categories,
  town = "",
  selected = [],
}: {
  userId: string;
  categories: Category[];
  town?: string;
  selected?: string[];
}) {
  const { kn, locale } = useUiStrings();

  const [chosen, setChosen] = useState(selected),
    [value, setValue] = useState(town),
    [message, setMessage] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const db = getBrowserClient();
        if (!db) return;
        const { error } = await db
          .from("profiles")
          .update({ town: value, interests: chosen })
          .eq("id", userId);
        setMessage(error ? kn.unavailable : kn.saved);
      }}
    >
      <label className="field">
        {kn.town}
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={100}
        />
      </label>
      <div
        className="category-chips"
        style={{ marginTop: 20, flexWrap: "wrap" }}
      >
        {categories.map((c) => (
          <button
            type="button"
            key={c.id}
            aria-pressed={chosen.includes(c.id)}
            className={"chip " + (chosen.includes(c.id) ? "active" : "")}
            onClick={() =>
              setChosen(
                chosen.includes(c.id)
                  ? chosen.filter((x) => x !== c.id)
                  : [...chosen, c.id],
              )
            }
          >
            {pickText(locale, c.name_kn, c.name_en)}
          </button>
        ))}
      </div>
      <button className="button button-ember">{kn.save}</button>
      <p role="status">{message}</p>
    </form>
  );
}
