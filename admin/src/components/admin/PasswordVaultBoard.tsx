"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Eye, EyeOff, KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import {
  deleteVaultEntry,
  revealVaultPassword,
  saveVaultEntry,
  type VaultRow,
} from "@/app/admin/password-vault/actions";

type FormState = {
  id?: string;
  title: string;
  siteUrl: string;
  email: string;
  password: string;
  notes: string;
};

const emptyForm: FormState = {
  title: "",
  siteUrl: "https://",
  email: "",
  password: "",
  notes: "",
};

export function PasswordVaultBoard({ rows }: { rows: VaultRow[] }) {
  const { tr } = useUiStrings();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.title, row.siteUrl, row.email, row.notes].join(" ").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function run(action: () => Promise<{ ok?: true; error?: string; password?: string }>, okMsg?: string) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        if (okMsg) setMessage({ ok: okMsg });
        if (result.password === undefined) {
          setEditing(false);
          setForm(emptyForm);
          setShowPassword(false);
          router.refresh();
        }
      }
      return result;
    });
  }

  async function copyText(value: string, ok: string) {
    try {
      await navigator.clipboard.writeText(value);
      setMessage({ ok });
    } catch {
      setMessage({
        error: tr({
          en: "Could not copy.",
          kn: "ನಕಲಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.",
          hi: "कॉपी नहीं हो सका।",
        }),
      });
    }
  }

  return (
    <div className="password-vault">
      <div className="section-title" style={{ margin: 0 }}>
        <h1 style={{ margin: 0 }}>
          {tr({ en: "Password vault", kn: "ಪಾಸ್‌ವರ್ಡ್ ವಾಲ್ಟ್", hi: "पासवर्ड वॉल्ट" })}
        </h1>
        <div className="page-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="button"
            disabled={pending}
            onClick={() => {
              setEditing(true);
              setForm(emptyForm);
              setShowPassword(false);
              setMessage({});
            }}
          >
            <Plus size={15} aria-hidden="true" />
            {tr({ en: "Add login", kn: "ಲಾಗಿನ್ ಸೇರಿಸಿ", hi: "लॉगिन जोड़ें" })}
          </button>
        </div>
      </div>

      <p className="task-request-lead">
        {tr({
          en: "Admin only. Site link, email and password are saved with encryption. Favicons load from the site domain after save.",
          kn: "ನಿರ್ವಾಹಕರು ಮಾತ್ರ. ಸೈಟ್ ಲಿಂಕ್, ಇಮೇಲ್ ಮತ್ತು ಪಾಸ್‌ವರ್ಡ್ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿ ಉಳಿಯುತ್ತವೆ. ಉಳಿಸಿದ ನಂತರ ಫ್ಯಾವಿಕಾನ್ ಸೈಟ್‌ನಿಂದ ಬರುತ್ತದೆ.",
          hi: "केवल एडमिन। साइट लिंक, ईमेल और पासवर्ड एन्क्रिप्टेड सहेजे जाते हैं। सेव के बाद फ़ेविकॉन साइट डोमेन से आता है।",
        })}
      </p>

      {message.error ? <p role="alert">{message.error}</p> : null}
      {message.ok ? <p role="status">{message.ok}</p> : null}

      {editing ? (
        <form
          className="panel password-vault-form"
          onSubmit={(event) => {
            event.preventDefault();
            run(
              () =>
                saveVaultEntry({
                  id: form.id,
                  title: form.title,
                  siteUrl: form.siteUrl,
                  email: form.email,
                  password: form.password,
                  notes: form.notes,
                }),
              form.id
                ? tr({ en: "Login updated.", kn: "ಲಾಗಿನ್ ನವೀಕರಿಸಲಾಯಿತು.", hi: "लॉगिन अपडेट हुआ।" })
                : tr({ en: "Login saved encrypted.", kn: "ಲಾಗಿನ್ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿ ಉಳಿಸಲಾಯಿತು.", hi: "लॉगिन एन्क्रिप्टेड सहेजा गया।" }),
            );
          }}
        >
          <h2>
            {form.id
              ? tr({ en: "Update login", kn: "ಲಾಗಿನ್ ನವೀಕರಿಸಿ", hi: "लॉगिन अपडेट" })
              : tr({ en: "New login", kn: "ಹೊಸ ಲಾಗಿನ್", hi: "नया लॉगिन" })}
          </h2>
          <div className="field-row" style={{ display: "grid", gap: "0.75rem" }}>
            <label className="field">
              <span>{tr({ en: "Title (optional)", kn: "ಶೀರ್ಷಿಕೆ (ಐಚ್ಛಿಕ)", hi: "शीर्षक (वैकल्पिक)" })}</span>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                maxLength={160}
                placeholder={tr({ en: "YouTube, Gmail…", kn: "YouTube, Gmail…", hi: "YouTube, Gmail…" })}
              />
            </label>
            <label className="field">
              <span>{tr({ en: "Site link", kn: "ಸೈಟ್ ಲಿಂಕ್", hi: "साइट लिंक" })}</span>
              <input
                type="url"
                required
                value={form.siteUrl}
                onChange={(e) => setForm((f) => ({ ...f, siteUrl: e.target.value }))}
                placeholder="https://example.com/login"
              />
            </label>
            <label className="field">
              <span>{tr({ en: "Email / username", kn: "ಇಮೇಲ್ / ಬಳಕೆದಾರರ ಹೆಸರು", hi: "ईमेल / उपयोगकर्ता नाम" })}</span>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                maxLength={320}
                autoComplete="off"
              />
            </label>
            <label className="field">
              <span>{tr({ en: "Password", kn: "ಪಾಸ್‌ವರ್ಡ್", hi: "पासवर्ड" })}</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  maxLength={500}
                  autoComplete="new-password"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="button button-outline is-compact"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={tr({ en: "Show password", kn: "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ", hi: "पासवर्ड दिखाएँ" })}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            <label className="field">
              <span>{tr({ en: "Notes (optional)", kn: "ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)", hi: "नोट (वैकल्पिक)" })}</span>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                maxLength={1000}
              />
            </label>
          </div>
          <div className="post-actions" style={{ marginTop: 12 }}>
            <button type="submit" className="button" disabled={pending}>
              <KeyRound size={15} aria-hidden="true" />
              {tr({ en: "Save encrypted", kn: "ಎನ್‌ಕ್ರಿಪ್ಟ್ ಉಳಿಸಿ", hi: "एन्क्रिप्टेड सहेजें" })}
            </button>
            <button
              type="button"
              className="button button-outline"
              disabled={pending}
              onClick={() => {
                setEditing(false);
                setForm(emptyForm);
              }}
            >
              {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
            </button>
          </div>
        </form>
      ) : null}

      <label className="field" style={{ maxWidth: 360 }}>
        <span className="sr-only">{tr({ en: "Search", kn: "ಹುಡುಕಿ", hi: "खोज" })}</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={tr({
            en: "Search title, site, or email…",
            kn: "ಶೀರ್ಷಿಕೆ, ಸೈಟ್ ಅಥವಾ ಇಮೇಲ್ ಹುಡುಕಿ…",
            hi: "शीर्षक, साइट या ईमेल खोजें…",
          })}
        />
      </label>

      {!visible.length ? (
        <p>
          {tr({
            en: "No saved logins yet.",
            kn: "ಇನ್ನೂ ಉಳಿಸಿದ ಲಾಗಿನ್‌ಗಳಿಲ್ಲ.",
            hi: "अभी कोई सहेजा लॉगिन नहीं।",
          })}
        </p>
      ) : (
        <div className="post-card-list password-vault-list">
          {visible.map((row, index) => {
            const secret = revealed[row.id];
            return (
              <article
                key={row.id}
                className="post-card is-draft password-vault-card"
                style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
              >
                <div className="post-card-thumb password-vault-favicon" aria-hidden="true">
                  {row.faviconUrl ? (
                    // Favicon from the saved site domain after encrypt-save.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.faviconUrl} alt="" width={48} height={48} />
                  ) : (
                    <KeyRound size={28} />
                  )}
                </div>
                <div className="post-card-body">
                  <h2>{row.title || row.siteUrl}</h2>
                  <p className="task-card-meta">
                    <a href={row.siteUrl} target="_blank" rel="noopener noreferrer">
                      {row.siteUrl}
                    </a>
                  </p>
                  <p className="task-card-meta">
                    <strong>{tr({ en: "Email", kn: "ಇಮೇಲ್", hi: "ईमेल" })}:</strong>{" "}
                    {row.email || "—"}
                  </p>
                  <p className="task-card-meta password-vault-secret">
                    <strong>{tr({ en: "Password", kn: "ಪಾಸ್‌ವರ್ಡ್", hi: "पासवर्ड" })}:</strong>{" "}
                    {secret ? secret : "••••••••"}
                  </p>
                  {row.notes ? <p className="task-request-admin-note">{row.notes}</p> : null}
                  <div className="post-actions">
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          if (secret) {
                            setRevealed((map) => {
                              const next = { ...map };
                              delete next[row.id];
                              return next;
                            });
                            return;
                          }
                          const result = await revealVaultPassword({ id: row.id });
                          if (result.error) setMessage({ error: result.error });
                          else if (result.password)
                            setRevealed((map) => ({ ...map, [row.id]: result.password as string }));
                        })
                      }
                    >
                      {secret ? <EyeOff size={15} /> : <Eye size={15} />}
                      {secret
                        ? tr({ en: "Hide", kn: "ಮರೆಮಾಡಿ", hi: "छिपाएँ" })
                        : tr({ en: "Show", kn: "ತೋರಿಸಿ", hi: "दिखाएँ" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending || !row.email}
                      onClick={() =>
                        copyText(
                          row.email,
                          tr({ en: "Email copied.", kn: "ಇಮೇಲ್ ನಕಲಿಸಲಾಯಿತು.", hi: "ईमेल कॉपी हुआ।" }),
                        )
                      }
                    >
                      <Copy size={15} />
                      {tr({ en: "Copy email", kn: "ಇಮೇಲ್ ನಕಲಿಸಿ", hi: "ईमेल कॉपी" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          let value = secret;
                          if (!value) {
                            const result = await revealVaultPassword({ id: row.id });
                            if (result.error) {
                              setMessage({ error: result.error });
                              return;
                            }
                            value = result.password || "";
                            if (value) setRevealed((map) => ({ ...map, [row.id]: value as string }));
                          }
                          if (value)
                            await copyText(
                              value,
                              tr({
                                en: "Password copied.",
                                kn: "ಪಾಸ್‌ವರ್ಡ್ ನಕಲಿಸಲಾಯಿತು.",
                                hi: "पासवर्ड कॉपी हुआ।",
                              }),
                            );
                        })
                      }
                    >
                      <Copy size={15} />
                      {tr({ en: "Copy password", kn: "ಪಾಸ್‌ವರ್ಡ್ ನಕಲಿಸಿ", hi: "पासवर्ड कॉपी" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() =>
                        start(async () => {
                          const result = await revealVaultPassword({ id: row.id });
                          if (result.error) {
                            setMessage({ error: result.error });
                            return;
                          }
                          setEditing(true);
                          setShowPassword(false);
                          setForm({
                            id: row.id,
                            title: row.title,
                            siteUrl: row.siteUrl,
                            email: row.email,
                            password: result.password || "",
                            notes: row.notes,
                          });
                        })
                      }
                    >
                      <Pencil size={15} />
                      {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() => {
                        if (
                          !window.confirm(
                            tr({
                              en: "Delete this saved login?",
                              kn: "ಈ ಉಳಿಸಿದ ಲಾಗಿನ್ ಅಳಿಸುವುದೇ?",
                              hi: "यह सहेजा लॉगिन हटाएँ?",
                            }),
                          )
                        )
                          return;
                        run(
                          () => deleteVaultEntry({ id: row.id }),
                          tr({ en: "Login deleted.", kn: "ಲಾಗಿನ್ ಅಳಿಸಲಾಯಿತು.", hi: "लॉगिन हटाया।" }),
                        );
                      }}
                    >
                      <Trash2 size={15} />
                      {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
