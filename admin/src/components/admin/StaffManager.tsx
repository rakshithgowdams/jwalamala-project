"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, KeyRound, Pencil, Power, Trash2, UserPlus, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { sectionGroups } from "@/lib/admin/sections";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/email";
import { createStaff, deleteStaff, setStaffActive, updateStaff } from "@/app/admin/staff/actions";

/** High-entropy password for new staff accounts (letters, digits, symbols). */
function generateSecurePassword(length = 16) {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_=+";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type StaffMember = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  role: string;
  sections: string[];
  active: boolean;
  lastSignIn: string | null;
  self: boolean;
};

type Draft = {
  id?: string;
  name: string;
  designation: string;
  email: string;
  phone: string;
  password: string;
  sections: string[];
};
const empty: Draft = { name: "", designation: "", email: "", phone: "", password: "", sections: [] };

/** Sidebar features an administrator can hand out; the dashboard is always included. */
const grantGroups = sectionGroups
  .map((group) => ({ ...group, sections: group.sections.filter((s) => s.key && !s.adminOnly) }))
  .filter((group) => group.sections.length);

export function StaffManager({ people }: { people: StaffMember[] }) {
  const { tr, locale } = useUiStrings();
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const staff = people.filter((p) => p.role === "staff");
  const admins = people.filter((p) => p.role === "admin");
  const labels = useMemo(
    () => new Map(sectionGroups.flatMap((g) => g.sections.map((s) => [s.key, tr(s.label)] as const))),
    [tr],
  );

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const toggle = (keys: string[], on: boolean) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            sections: on
              ? [...new Set([...d.sections, ...keys])]
              : d.sections.filter((k) => !keys.includes(k)),
          }
        : d,
    );

  function run(action: () => Promise<{ ok?: true; error?: string }>, done: string, after?: () => void) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        setMessage({ ok: done });
        after?.();
        router.refresh();
      }
    });
  }

  function save() {
    if (!draft) return;
    const { id, ...fields } = draft;
    run(
      () => (id ? updateStaff({ id, ...fields }) : createStaff(fields)),
      id
        ? tr({ en: "Staff member updated.", kn: "ಸಿಬ್ಬಂದಿ ವಿವರ ನವೀಕರಿಸಲಾಗಿದೆ.", hi: "स्टाफ़ सदस्य अपडेट हुआ।" })
        : tr({ en: "Staff account created. They can sign in now.", kn: "ಸಿಬ್ಬಂದಿ ಖಾತೆ ತೆರೆಯಲಾಗಿದೆ. ಅವರು ಈಗ ಲಾಗಿನ್ ಆಗಬಹುದು.", hi: "स्टाफ़ खाता बन गया। वे अब साइन इन कर सकते हैं।" }),
      () => setDraft(null),
    );
  }

  const when = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(locale + "-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })
      : tr({ en: "Never", kn: "ಇನ್ನೂ ಇಲ್ಲ", hi: "कभी नहीं" });

  return (
    <div className="staff-manager">
      <div className="page-actions">
        <button
          type="button"
          className="button button-ember"
          onClick={() => {
            setDraft({ ...empty });
            setMessage({});
          }}
        >
          <UserPlus size={16} aria-hidden="true" />
          {tr({ en: "New staff member", kn: "ಹೊಸ ಸಿಬ್ಬಂದಿ", hi: "नया स्टाफ़ सदस्य" })}
        </button>
      </div>

      {message.error && <p role="alert">{message.error}</p>}
      {message.ok && <p className="form-message" role="status">{message.ok}</p>}

      {draft && (
        <form
          className="utility-panel staff-form"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="staff-form-head">
            <h2>
              {draft.id
                ? tr({ en: "Edit staff member", kn: "ಸಿಬ್ಬಂದಿ ವಿವರ ತಿದ್ದಿ", hi: "स्टाफ़ सदस्य संपादित करें" })
                : tr({ en: "New staff member", kn: "ಹೊಸ ಸಿಬ್ಬಂದಿ", hi: "नया स्टाफ़ सदस्य" })}
            </h2>
            <button type="button" className="icon-button" onClick={() => setDraft(null)} aria-label={tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद करें" })}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="staff-fields">
            <label className="field">
              {tr({ en: "Staff name", kn: "ಸಿಬ್ಬಂದಿ ಹೆಸರು", hi: "स्टाफ़ का नाम" })}
              <input required minLength={2} maxLength={100} value={draft.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" />
            </label>
            <label className="field">
              {tr({ en: "Designation", kn: "ಹುದ್ದೆ", hi: "पद" })}
              <input required minLength={2} maxLength={80} value={draft.designation} onChange={(e) => set({ designation: e.target.value })} placeholder={tr({ en: "e.g. Reporter, Sub editor", kn: "ಉದಾ: ವರದಿಗಾರ, ಉಪ ಸಂಪಾದಕ", hi: "जैसे: रिपोर्टर, उप संपादक" })} />
            </label>
            <label className="field">
              {tr({ en: "Email", kn: "ಇಮೇಲ್", hi: "ईमेल" })}
              <input required type="email" maxLength={254} value={draft.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" />
            </label>
            <label className="field">
              {tr({ en: "Phone number", kn: "ಫೋನ್ ಸಂಖ್ಯೆ", hi: "फ़ोन नंबर" })}
              <input type="tel" inputMode="tel" maxLength={20} pattern="\+?[0-9][0-9 ()\-]{6,19}" value={draft.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+91 98765 43210" />
            </label>
            <label className="field">
              {draft.id
                ? tr({ en: "New password (leave empty to keep)", kn: "ಹೊಸ ಪಾಸ್‌ವರ್ಡ್ (ಬದಲಾಯಿಸದಿದ್ದರೆ ಖಾಲಿ ಬಿಡಿ)", hi: "नया पासवर्ड (न बदलना हो तो खाली छोड़ें)" })
                : tr({ en: `Password (at least ${MIN_PASSWORD_LENGTH} characters)`, kn: `ಪಾಸ್‌ವರ್ಡ್ (ಕನಿಷ್ಠ ${MIN_PASSWORD_LENGTH} ಅಕ್ಷರಗಳು)`, hi: `पासवर्ड (कम से कम ${MIN_PASSWORD_LENGTH} अक्षर)` })}
              <span className="staff-password">
                <input
                  type={showPassword ? "text" : "password"}
                  required={!draft.id}
                  minLength={draft.id && !draft.password ? undefined : MIN_PASSWORD_LENGTH}
                  maxLength={72}
                  value={draft.password}
                  onChange={(e) => set({ password: e.target.value })}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="icon-button"
                  title={tr({ en: "Generate secure password", kn: "ಸುರಕ್ಷಿತ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ", hi: "सुरक्षित पासवर्ड बनाएँ" })}
                  aria-label={tr({ en: "Generate secure password", kn: "ಸುರಕ್ಷಿತ ಪಾಸ್‌ವರ್ಡ್ ರಚಿಸಿ", hi: "सुरक्षित पासवर्ड बनाएँ" })}
                  onClick={() => {
                    const next = generateSecurePassword();
                    set({ password: next });
                    setShowPassword(true);
                    setCopied(false);
                  }}
                >
                  <KeyRound size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="icon-button"
                  disabled={!draft.password}
                  title={tr({ en: "Copy password", kn: "ಪಾಸ್‌ವರ್ಡ್ ನಕಲಿಸಿ", hi: "पासवर्ड कॉपी करें" })}
                  aria-label={tr({ en: "Copy password", kn: "ಪಾಸ್‌ವರ್ಡ್ ನಕಲಿಸಿ", hi: "पासवर्ड कॉपी करें" })}
                  onClick={async () => {
                    if (!draft.password) return;
                    try {
                      await navigator.clipboard.writeText(draft.password);
                      setCopied(true);
                      window.setTimeout(() => setCopied(false), 2000);
                    } catch {
                      setMessage({
                        error: tr({
                          en: "Could not copy. Select the password and copy it manually.",
                          kn: "ನಕಲಿಸಲು ಆಗಲಿಲ್ಲ. ಪಾಸ್‌ವರ್ಡ್ ಆಯ್ಕೆಮಾಡಿ ಕೈಯಾರೆ ನಕಲಿಸಿ.",
                          hi: "कॉपी नहीं हो सका। पासवर्ड चुनकर खुद कॉपी करें।",
                        }),
                      });
                    }
                  }}
                >
                  {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
                </button>
                <button type="button" className="icon-button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? tr({ en: "Hide password", kn: "ಪಾಸ್‌ವರ್ಡ್ ಮರೆಮಾಡಿ", hi: "पासवर्ड छिपाएँ" }) : tr({ en: "Show password", kn: "ಪಾಸ್‌ವರ್ಡ್ ತೋರಿಸಿ", hi: "पासवर्ड दिखाएँ" })}>
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </span>
              <small className="staff-password-hint">
                {tr({
                  en: "Use Generate (key icon), Copy it for the staff member, then Create staff account.",
                  kn: "ರಚಿಸಿ (ಕೀ ಐಕಾನ್) ಬಳಸಿ, ಸಿಬ್ಬಂದಿಗೆ ನಕಲಿಸಿ, ನಂತರ ಖಾತೆ ತೆರೆಯಿರಿ.",
                  hi: "Generate (कुंजी आइकन) दबाएँ, स्टाफ़ के लिए कॉपी करें, फिर खाता बनाएँ।",
                })}
              </small>
            </label>
          </div>

          <fieldset className="staff-access">
            <legend>
              {tr({ en: "Sidebar features this person can use", kn: "ಈ ವ್ಯಕ್ತಿ ಬಳಸಬಹುದಾದ ಸೈಡ್‌ಬಾರ್ ವಿಭಾಗಗಳು", hi: "यह व्यक्ति कौन-से साइडबार फ़ीचर इस्तेमाल कर सकता है" })}
            </legend>
            <p className="meta">
              {tr({ en: "The dashboard is always included. Staff & access, Users, Roles, 301 redirects and Site settings stay administrator-only.", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಯಾವಾಗಲೂ ಇರುತ್ತದೆ. ಸಿಬ್ಬಂದಿ ಮತ್ತು ಪ್ರವೇಶ, ಬಳಕೆದಾರರು, ಪಾತ್ರಗಳು, 301 ಮರುನಿರ್ದೇಶನ ಮತ್ತು ತಾಣದ ಸೆಟ್ಟಿಂಗ್ಸ್ ನಿರ್ವಾಹಕರಿಗೆ ಮಾತ್ರ.", hi: "डैशबोर्ड हमेशा शामिल है। स्टाफ़ और पहुँच, उपयोगकर्ता, भूमिकाएँ, 301 रीडायरेक्ट और साइट सेटिंग्स केवल एडमिन के लिए हैं।" })}
            </p>
            <div className="staff-access-groups">
              {grantGroups.map((group) => {
                const keys = group.sections.map((s) => s.key);
                const chosen = keys.filter((k) => draft.sections.includes(k)).length;
                return (
                  <div className="staff-access-group" key={group.title.en}>
                    <label className="staff-access-all">
                      <input
                        type="checkbox"
                        checked={chosen === keys.length}
                        ref={(el) => {
                          if (el) el.indeterminate = chosen > 0 && chosen < keys.length;
                        }}
                        onChange={(e) => toggle(keys, e.target.checked)}
                      />
                      <strong>{tr(group.title)}</strong>
                      <small>{chosen}/{keys.length}</small>
                    </label>
                    {group.sections.map((section) => (
                      <label key={section.key}>
                        <input
                          type="checkbox"
                          checked={draft.sections.includes(section.key)}
                          onChange={(e) => toggle([section.key], e.target.checked)}
                        />
                        {tr(section.label)}
                      </label>
                    ))}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="page-actions">
            <button type="submit" className="button button-ember" disabled={pending}>
              {pending
                ? tr({ en: "Saving…", kn: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…", hi: "सहेजा जा रहा है…" })
                : draft.id
                  ? tr({ en: "Save changes", kn: "ಬದಲಾವಣೆ ಉಳಿಸಿ", hi: "बदलाव सहेजें" })
                  : tr({ en: "Create staff account", kn: "ಸಿಬ್ಬಂದಿ ಖಾತೆ ತೆರೆಯಿರಿ", hi: "स्टाफ़ खाता बनाएँ" })}
            </button>
            <button type="button" className="button button-outline" onClick={() => setDraft(null)}>
              {tr({ en: "Cancel", kn: "ರದ್ದುಮಾಡಿ", hi: "रद्द करें" })}
            </button>
          </div>
        </form>
      )}

      <section className="utility-panel">
        <h2>{tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" })} ({staff.length})</h2>
        {staff.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>{tr({ en: "Name", kn: "ಹೆಸರು", hi: "नाम" })}</th>
                  <th>{tr({ en: "Contact", kn: "ಸಂಪರ್ಕ", hi: "संपर्क" })}</th>
                  <th>{tr({ en: "Access", kn: "ಪ್ರವೇಶ", hi: "पहुँच" })}</th>
                  <th>{tr({ en: "Last sign-in", kn: "ಕೊನೆಯ ಲಾಗಿನ್", hi: "आख़िरी साइन-इन" })}</th>
                  <th>{tr({ en: "Actions", kn: "ಕ್ರಿಯೆಗಳು", hi: "कार्रवाई" })}</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => (
                  <tr key={person.id} className={person.active ? undefined : "is-disabled"}>
                    <td>
                      <strong>{person.name || "—"}</strong>
                      <small className="staff-sub">{person.designation}</small>
                      {!person.active && (
                        <span className="staff-badge">{tr({ en: "Disabled", kn: "ನಿಷ್ಕ್ರಿಯ", hi: "निष्क्रिय" })}</span>
                      )}
                    </td>
                    <td>
                      {person.email}
                      <small className="staff-sub">{person.phone || "—"}</small>
                    </td>
                    <td className="staff-access-summary">
                      {person.sections.length
                        ? person.sections.map((k) => labels.get(k) || k).join(", ")
                        : tr({ en: "Dashboard only", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಮಾತ್ರ", hi: "केवल डैशबोर्ड" })}
                    </td>
                    <td>{when(person.lastSignIn)}</td>
                    <td>
                      <div className="staff-row-actions">
                        <button
                          type="button"
                          className="button button-outline is-compact"
                          disabled={pending}
                          onClick={() => {
                            setMessage({});
                            setDraft({ id: person.id, name: person.name, designation: person.designation, email: person.email, phone: person.phone, password: "", sections: person.sections });
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          <Pencil size={14} aria-hidden="true" />
                          {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
                        </button>
                        <button
                          type="button"
                          className="button button-outline is-compact"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => setStaffActive(person.id, !person.active),
                              person.active
                                ? tr({ en: "Account disabled. They can no longer sign in.", kn: "ಖಾತೆ ನಿಷ್ಕ್ರಿಯಗೊಂಡಿದೆ. ಅವರು ಇನ್ನು ಲಾಗಿನ್ ಆಗಲು ಸಾಧ್ಯವಿಲ್ಲ.", hi: "खाता निष्क्रिय। वे अब साइन इन नहीं कर सकते।" })
                                : tr({ en: "Account enabled.", kn: "ಖಾತೆ ಸಕ್ರಿಯಗೊಂಡಿದೆ.", hi: "खाता सक्रिय।" }),
                            )
                          }
                        >
                          <Power size={14} aria-hidden="true" />
                          {person.active
                            ? tr({ en: "Disable", kn: "ನಿಷ್ಕ್ರಿಯಗೊಳಿಸಿ", hi: "निष्क्रिय करें" })
                            : tr({ en: "Enable", kn: "ಸಕ್ರಿಯಗೊಳಿಸಿ", hi: "सक्रिय करें" })}
                        </button>
                        <button
                          type="button"
                          className="button button-danger is-compact"
                          disabled={pending}
                          onClick={() => {
                            if (confirmDelete !== person.id) return setConfirmDelete(person.id);
                            setConfirmDelete(null);
                            run(() => deleteStaff(person.id), tr({ en: "Staff account deleted.", kn: "ಸಿಬ್ಬಂದಿ ಖಾತೆ ಅಳಿಸಲಾಗಿದೆ.", hi: "स्टाफ़ खाता हटाया गया।" }));
                          }}
                        >
                          <Trash2 size={14} aria-hidden="true" />
                          {confirmDelete === person.id
                            ? tr({ en: "Confirm delete", kn: "ಅಳಿಸುವುದನ್ನು ದೃಢೀಕರಿಸಿ", hi: "हटाना पक्का करें" })
                            : tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="meta">
            {tr({ en: "No staff accounts yet. Use “New staff member” to add one.", kn: "ಇನ್ನೂ ಸಿಬ್ಬಂದಿ ಖಾತೆಗಳಿಲ್ಲ. ಸೇರಿಸಲು “ಹೊಸ ಸಿಬ್ಬಂದಿ” ಬಳಸಿ.", hi: "अभी कोई स्टाफ़ खाता नहीं। जोड़ने के लिए “नया स्टाफ़ सदस्य” इस्तेमाल करें।" })}
          </p>
        )}
      </section>

      <section className="utility-panel">
        <h2>{tr({ en: "Administrators", kn: "ನಿರ್ವಾಹಕರು", hi: "एडमिन" })} ({admins.length})</h2>
        <p className="meta">
          {tr({ en: "Administrators can use every feature. They are managed with the admin sign-up approval, not here.", kn: "ನಿರ್ವಾಹಕರು ಎಲ್ಲಾ ವಿಭಾಗಗಳನ್ನು ಬಳಸಬಹುದು. ಅವರನ್ನು ನಿರ್ವಾಹಕ ನೋಂದಣಿ ಅನುಮೋದನೆಯ ಮೂಲಕ ನಿರ್ವಹಿಸಲಾಗುತ್ತದೆ.", hi: "एडमिन हर फ़ीचर इस्तेमाल कर सकते हैं। उन्हें एडमिन साइन-अप अनुमोदन से प्रबंधित किया जाता है, यहाँ से नहीं।" })}
        </p>
        <ul className="staff-admins">
          {admins.map((person) => (
            <li key={person.id}>
              <strong>{person.name || person.email}</strong>
              <span>{person.email}</span>
              {person.self && <span className="staff-badge is-you">{tr({ en: "You", kn: "ನೀವು", hi: "आप" })}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
