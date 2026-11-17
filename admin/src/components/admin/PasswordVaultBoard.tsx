"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Link2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import {
  createVaultShareLink,
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
  const [shareUrl, setShareUrl] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VaultRow | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [row.title, row.siteUrl, row.email, row.notes].join(" ").toLowerCase().includes(q),
    );
  }, [rows, query]);

  function placeMenu(button: HTMLButtonElement, panel?: HTMLElement | null) {
    const rect = button.getBoundingClientRect();
    const panelWidth = Math.max(panel?.offsetWidth || 0, 220);
    const panelHeight = Math.max(panel?.offsetHeight || 0, 320);
    const gap = 8;
    const left = Math.min(
      Math.max(12, rect.right - panelWidth),
      Math.max(12, window.innerWidth - panelWidth - 12),
    );
    const below = rect.bottom + gap;
    const fitsBelow = below + panelHeight <= window.innerHeight - 12;
    const top = fitsBelow
      ? below
      : Math.max(12, Math.min(rect.top - panelHeight - gap, window.innerHeight - panelHeight - 12));
    setMenuPos({ top, left });
  }

  function openMenu(rowId: string, button: HTMLButtonElement) {
    if (menuOpenId === rowId) {
      setMenuOpenId(null);
      setMenuPos(null);
      return;
    }
    placeMenu(button);
    setMenuOpenId(rowId);
  }

  useEffect(() => {
    if (!menuOpenId) return;

    function onReposition() {
      const trigger = triggerRefs.current[menuOpenId];
      if (trigger) placeMenu(trigger, menuRef.current);
    }

    const frame = window.requestAnimationFrame(onReposition);

    function onPointer(event: MouseEvent) {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRefs.current[menuOpenId]?.contains(target)) return;
      setMenuOpenId(null);
      setMenuPos(null);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpenId(null);
        setMenuPos(null);
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [menuOpenId]);

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

  function closeMenu() {
    setMenuOpenId(null);
    setMenuPos(null);
  }

  function openAddPopup() {
    closeMenu();
    setEditing(true);
    setForm(emptyForm);
    setShowPassword(false);
    setMessage({});
  }

  function closeFormPopup() {
    if (pending) return;
    setEditing(false);
    setForm(emptyForm);
    setShowPassword(false);
  }

  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeFormPopup();
    }
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [editing, pending]);

  const openRow = menuOpenId ? visible.find((row) => row.id === menuOpenId) : null;
  const openSecret = openRow ? revealed[openRow.id] : undefined;

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
            onClick={openAddPopup}
          >
            <Plus size={15} aria-hidden="true" />
            {tr({ en: "Add login", kn: "ಲಾಗಿನ್ ಸೇರಿಸಿ", hi: "लॉगिन जोड़ें" })}
          </button>
        </div>
      </div>

      <p className="task-request-lead">
        {tr({
          en: "Admin only. Credentials are encrypted. Open ⋮ on a card for Show, Copy, Share link, Edit, Delete, and more.",
          kn: "ನಿರ್ವಾಹಕರು ಮಾತ್ರ. ರಹಸ್ಯಗಳು ಎನ್‌ಕ್ರಿಪ್ಟ್. ಕಾರ್ಡ್‌ನ ⋮ ನಿಂದ Show, Copy, Share, Edit, Delete.",
          hi: "केवल एडमिन। क्रेडेंशियल एन्क्रिप्टेड हैं। कार्ड पर ⋮ से Show, Copy, Share, Edit, Delete।",
        })}
      </p>

      {message.error && !editing ? <p role="alert">{message.error}</p> : null}
      {message.ok ? <p role="status">{message.ok}</p> : null}
      {shareUrl ? (
        <p className="password-vault-share-banner" role="status">
          <strong>{tr({ en: "Share link", kn: "ಹಂಚಿಕೆ ಲಿಂಕ್", hi: "शेयर लिंक" })}:</strong>{" "}
          <a href={shareUrl} target="_blank" rel="noopener noreferrer">
            {shareUrl}
          </a>{" "}
          <button
            type="button"
            className="button button-outline is-compact"
            onClick={() =>
              copyText(
                shareUrl,
                tr({ en: "Share link copied.", kn: "ಹಂಚಿಕೆ ಲಿಂಕ್ ನಕಲಿಸಲಾಯಿತು.", hi: "शेयर लिंक कॉपी हुआ।" }),
              )
            }
          >
            <Copy size={14} /> {tr({ en: "Copy link", kn: "ಲಿಂಕ್ ನಕಲಿಸಿ", hi: "लिंक कॉपी" })}
          </button>
        </p>
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
            const menuOpen = menuOpenId === row.id;
            return (
              <article
                key={row.id}
                className={
                  "post-card is-draft password-vault-card" + (menuOpen ? " is-menu-open" : "")
                }
                style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
              >
                <div className="post-card-body">
                  <div className="password-vault-card-top">
                    <div className="password-vault-title-row">
                      {row.faviconUrl ? (
                        <span className="password-vault-favicon-wrap" aria-hidden="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            className="password-vault-favicon"
                            src={row.faviconUrl}
                            alt=""
                            width={32}
                            height={32}
                            onError={(event) => {
                              const wrap = event.currentTarget.parentElement;
                              if (wrap) wrap.style.display = "none";
                            }}
                          />
                        </span>
                      ) : null}
                      <h2>{row.title || row.siteUrl}</h2>
                    </div>
                    <div className="password-vault-menu">
                      <button
                        type="button"
                        className="password-vault-menu-trigger"
                        ref={(node) => {
                          triggerRefs.current[row.id] = node;
                        }}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label={tr({
                          en: "More actions",
                          kn: "ಹೆಚ್ಚು ಕ್ರಿಯೆಗಳು",
                          hi: "और क्रियाएँ",
                        })}
                        disabled={pending}
                        onClick={(event) => openMenu(row.id, event.currentTarget)}
                      >
                        <MoreVertical size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {openRow && menuPos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              className="password-vault-menu-panel is-portal"
              role="menu"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  const row = openRow;
                  closeMenu();
                  start(async () => {
                    if (openSecret) {
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
                      setRevealed((map) => ({
                        ...map,
                        [row.id]: result.password as string,
                      }));
                  });
                }}
              >
                {openSecret ? <EyeOff size={15} /> : <Eye size={15} />}
                {openSecret
                  ? tr({ en: "Hide password", kn: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆಮಾಡಿ", hi: "पासवर्ड छिपाएँ" })
                  : tr({ en: "Show password", kn: "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ", hi: "पासवर्ड दिखाएँ" })}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending || !openRow.email}
                onClick={() => {
                  const email = openRow.email;
                  closeMenu();
                  copyText(
                    email,
                    tr({
                      en: "Email copied.",
                      kn: "ಇಮೇಲ್ ನಕಲಿಸಲಾಯಿತು.",
                      hi: "ईमेल कॉपी हुआ।",
                    }),
                  );
                }}
              >
                <Copy size={15} />
                {tr({ en: "Copy email", kn: "ಇಮೇಲ್ ನಕಲಿಸಿ", hi: "ईमेल कॉपी" })}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  const row = openRow;
                  const secret = openSecret;
                  closeMenu();
                  start(async () => {
                    let value = secret;
                    if (!value) {
                      const result = await revealVaultPassword({ id: row.id });
                      if (result.error) {
                        setMessage({ error: result.error });
                        return;
                      }
                      value = result.password || "";
                      if (value)
                        setRevealed((map) => ({
                          ...map,
                          [row.id]: value as string,
                        }));
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
                  });
                }}
              >
                <Copy size={15} />
                {tr({ en: "Copy password", kn: "ಪಾಸ್‌ವರ್ಡ್ ನಕಲಿಸಿ", hi: "पासवर्ड कॉपी" })}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  const siteUrl = openRow.siteUrl;
                  closeMenu();
                  copyText(
                    siteUrl,
                    tr({
                      en: "Site link copied.",
                      kn: "ಸೈಟ್ ಲಿಂಕ್ ನಕಲಿಸಲಾಯಿತು.",
                      hi: "साइट लिंक कॉपी हुआ।",
                    }),
                  );
                }}
              >
                <Copy size={15} />
                {tr({ en: "Copy site link", kn: "ಸೈಟ್ ಲಿಂಕ್ ನಕಲಿಸಿ", hi: "साइट लिंक कॉपी" })}
              </button>
              <a
                role="menuitem"
                href={openRow.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMenu}
              >
                <ExternalLink size={15} />
                {tr({ en: "Open site", kn: "ಸೈಟ್ ತೆರೆಯಿರಿ", hi: "साइट खोलें" })}
              </a>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  const row = openRow;
                  closeMenu();
                  start(async () => {
                    const result = await createVaultShareLink({
                      id: row.id,
                      hours: 24,
                    });
                    if (result.error) {
                      setMessage({ error: result.error });
                      setShareUrl("");
                      return;
                    }
                    setShareUrl(result.shareUrl || "");
                    setMessage({
                      ok: tr({
                        en: "Share link ready for 24 hours. Copy and send it.",
                        kn: "24 ಗಂಟೆಗಳ ಹಂಚಿಕೆ ಲಿಂಕ್ ಸಿದ್ಧ. ನಕಲಿಸಿ ಕಳುಹಿಸಿ.",
                        hi: "24 घंटे का शेयर लिंक तैयार। कॉपी कर भेजें।",
                      }),
                    });
                    if (result.shareUrl) {
                      try {
                        await navigator.clipboard.writeText(result.shareUrl);
                      } catch {
                        /* banner still shows the link */
                      }
                    }
                  });
                }}
              >
                <Link2 size={15} />
                {tr({ en: "Share link", kn: "ಹಂಚಿಕೆ ಲಿಂಕ್", hi: "शेयर लिंक" })}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                onClick={() => {
                  const row = openRow;
                  closeMenu();
                  start(async () => {
                    const result = await revealVaultPassword({ id: row.id });
                    if (result.error) {
                      setMessage({ error: result.error });
                      return;
                    }
                    setMessage({});
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
                  });
                }}
              >
                <Pencil size={15} />
                {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित" })}
              </button>
              <button
                type="button"
                role="menuitem"
                className="is-danger"
                disabled={pending}
                onClick={() => {
                  const row = openRow;
                  closeMenu();
                  setDeleteTarget(row);
                }}
              >
                <Trash2 size={15} />
                {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
              </button>
            </div>,
            document.body,
          )
        : null}

      {editing && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop password-vault-form-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget) closeFormPopup();
              }}
            >
              <form
                className="delete-dialog confirm-dialog password-vault-form-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="password-vault-form-title"
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
                      ? tr({
                          en: "Login updated.",
                          kn: "ಲಾಗಿನ್ ನವೀಕರಿಸಲಾಯಿತು.",
                          hi: "लॉगिन अपडेट हुआ।",
                        })
                      : tr({
                          en: "Login saved encrypted.",
                          kn: "ಲಾಗಿನ್ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿ ಉಳಿಸಲಾಯಿತು.",
                          hi: "लॉगिन एन्क्रिप्टेड सहेजा गया।",
                        }),
                  );
                }}
              >
                <header className="password-vault-form-head">
                  <h2 id="password-vault-form-title">
                    {form.id
                      ? tr({ en: "Update login", kn: "ಲಾಗಿನ್ ನವೀಕರಿಸಿ", hi: "लॉगिन अपडेट" })
                      : tr({ en: "Add login", kn: "ಲಾಗಿನ್ ಸೇರಿಸಿ", hi: "लॉगिन जोड़ें" })}
                  </h2>
                  <button
                    type="button"
                    className="password-vault-form-close"
                    disabled={pending}
                    aria-label={tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद करें" })}
                    onClick={closeFormPopup}
                  >
                    <X size={18} aria-hidden="true" />
                  </button>
                </header>
                <div className="password-vault-form-body">
                  <p className="password-vault-form-lead">
                    {tr({
                      en: "Credentials are encrypted before they are saved.",
                      kn: "ಉಳಿಸುವ ಮೊದಲು ರಹಸ್ಯಗಳು ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗುತ್ತವೆ.",
                      hi: "सेव करने से पहले क्रेडेंशियल एन्क्रिप्ट होते हैं।",
                    })}
                  </p>
                  {message.error ? (
                    <p className="password-vault-form-error" role="alert">
                      {message.error}
                    </p>
                  ) : null}
                  <div className="password-vault-form-fields">
                    <label className="field">
                      <span>
                        {tr({
                          en: "Title (optional)",
                          kn: "ಶೀರ್ಷಿಕೆ (ಐಚ್ಛಿಕ)",
                          hi: "शीर्षक (वैकल्पिक)",
                        })}
                      </span>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                        maxLength={160}
                        placeholder={tr({
                          en: "YouTube, Gmail…",
                          kn: "YouTube, Gmail…",
                          hi: "YouTube, Gmail…",
                        })}
                        autoFocus
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
                      <span>
                        {tr({
                          en: "Email / username",
                          kn: "ಇಮೇಲ್ / ಬಳಕೆದಾರರ ಹೆಸರು",
                          hi: "ईमेल / उपयोगकर्ता नाम",
                        })}
                      </span>
                      <input
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        maxLength={320}
                        autoComplete="off"
                      />
                    </label>
                    <label className="field">
                      <span>{tr({ en: "Password", kn: "ಪಾಸ್‌ವರ್ಡ್", hi: "पासवर्ड" })}</span>
                      <div className="password-vault-form-password">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={form.password}
                          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                          maxLength={500}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          className="button button-outline is-compact"
                          onClick={() => setShowPassword((v) => !v)}
                          aria-label={tr({
                            en: "Show password",
                            kn: "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ",
                            hi: "पासवर्ड दिखाएँ",
                          })}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>
                    <label className="field">
                      <span>
                        {tr({
                          en: "Notes (optional)",
                          kn: "ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)",
                          hi: "नोट (वैकल्पिक)",
                        })}
                      </span>
                      <input
                        value={form.notes}
                        onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                        maxLength={1000}
                      />
                    </label>
                  </div>
                </div>
                <footer className="password-vault-form-footer delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={closeFormPopup}
                  >
                    {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
                  </button>
                  <button type="submit" className="button" disabled={pending}>
                    <KeyRound size={15} aria-hidden="true" />
                    {tr({
                      en: "Save encrypted",
                      kn: "ಎನ್‌ಕ್ರಿಪ್ಟ್ ಉಳಿಸಿ",
                      hi: "एन्क्रिप्टेड सहेजें",
                    })}
                  </button>
                </footer>
              </form>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop password-vault-form-backdrop"
              role="presentation"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !pending) setDeleteTarget(null);
              }}
            >
              <div
                className="delete-dialog confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="password-vault-delete-title"
                onMouseDown={(event) => event.stopPropagation()}
              >
                <div className="confirm-dialog-icon" aria-hidden="true">
                  <CircleAlert size={28} strokeWidth={2.25} />
                </div>
                <h2 id="password-vault-delete-title">
                  {tr({
                    en: "Are you sure?",
                    kn: "ನೀವು ಖಚಿತವೇ?",
                    hi: "क्या आप सुनिश्चित हैं?",
                  })}
                </h2>
                <p>
                  {tr({
                    en: "This will permanently delete this saved login. You cannot undo this action.",
                    kn: "ಈ ಉಳಿಸಿದ ಲಾಗಿನ್ ಶಾಶ್ವತವಾಗಿ ಅಳಿಸಲಾಗುತ್ತದೆ. ಇದನ್ನು ರದ್ದುಗೊಳಿಸಲು ಸಾಧ್ಯವಿಲ್ಲ.",
                    hi: "यह सहेजा लॉगिन स्थायी रूप से हट जाएगा। इसे वापस नहीं लाया जा सकता।",
                  })}
                </p>
                <div className="confirm-dialog-preview">
                  {deleteTarget.faviconUrl ? (
                    <span className="confirm-dialog-thumb password-vault-delete-thumb">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deleteTarget.faviconUrl} alt="" width={40} height={40} />
                    </span>
                  ) : (
                    <span className="confirm-dialog-thumb password-vault-delete-thumb" aria-hidden="true">
                      <KeyRound size={20} />
                    </span>
                  )}
                  <div>
                    <strong>{deleteTarget.title || deleteTarget.siteUrl}</strong>
                    <small>{deleteTarget.email || deleteTarget.siteUrl}</small>
                  </div>
                </div>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setDeleteTarget(null)}
                  >
                    {tr({ en: "Keep login", kn: "ಲಾಗಿನ್ ಇರಿಸಿ", hi: "लॉगिन रखें" })}
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={pending}
                    onClick={() => {
                      const id = deleteTarget.id;
                      setDeleteTarget(null);
                      setRevealed((map) => {
                        const next = { ...map };
                        delete next[id];
                        return next;
                      });
                      run(
                        () => deleteVaultEntry({ id }),
                        tr({
                          en: "Login deleted.",
                          kn: "ಲಾಗಿನ್ ಅಳಿಸಲಾಯಿತು.",
                          hi: "लॉगिन हटाया।",
                        }),
                      );
                    }}
                  >
                    {tr({
                      en: "Yes, delete it",
                      kn: "ಹೌದು, ಅಳಿಸಿ",
                      hi: "हाँ, हटाएँ",
                    })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
