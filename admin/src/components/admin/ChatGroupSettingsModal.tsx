"use client";
import { useEffect, useId, useMemo, useState, useTransition } from "react";
import {
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  RefreshCw,
  ShieldOff,
  Trash2,
  Users,
  Volume2,
  Webhook,
  X,
} from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { ChatRoom, ChatStaff } from "@/components/admin/StaffChat";
import {
  revokeChatWebhookSecret,
  rotateChatWebhookSecret,
} from "@/app/admin/chat/actions";
import type { ChatWebhookSecretStatus } from "@/lib/chat/webhook-secret";
import {
  chatNotificationPermission,
  ensureChatNotificationPermission,
  getChatNotifyVolume,
  playChatNotifySound,
  setChatNotifyVolume,
  unlockChatSound,
} from "@/lib/chat/notify";

type Tab = "notifications" | "members" | "api" | "danger";

type Props = {
  open: boolean;
  room: ChatRoom;
  staff: ChatStaff[];
  isAdmin?: boolean;
  webhookPath: string;
  webhookStatus?: ChatWebhookSecretStatus;
  pending?: boolean;
  onClose: () => void;
  onSaveMembers: (memberIds: string[]) => void;
  onDeleteGroup: () => void;
};

export function ChatGroupSettingsModal({
  open,
  room,
  staff,
  isAdmin = false,
  webhookPath,
  webhookStatus,
  pending,
  onClose,
  onSaveMembers,
  onDeleteGroup,
}: Props) {
  const { tr } = useUiStrings();
  const titleId = useId();
  const [tab, setTab] = useState<Tab>("notifications");
  const [memberIds, setMemberIds] = useState(room.memberIds);
  const [copied, setCopied] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [secretStatus, setSecretStatus] = useState<ChatWebhookSecretStatus | undefined>(webhookStatus);
  const [freshSecret, setFreshSecret] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState(false);
  const [secretError, setSecretError] = useState("");
  const [secretBusy, startSecretTransition] = useTransition();
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");
  const [notifyVolume, setNotifyVolume] = useState(82);

  useEffect(() => {
    if (!open) return;
    setTab("notifications");
    setMemberIds(room.memberIds);
    setConfirmName("");
    setCopied("");
    setFreshSecret(null);
    setRevealSecret(false);
    setSecretError("");
    setSecretStatus(webhookStatus);
    setNotifyPerm(chatNotificationPermission());
    setNotifyVolume(getChatNotifyVolume());
  }, [open, room.id, room.memberIds, webhookStatus]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const sampleJson = useMemo(
    () =>
      JSON.stringify(
        {
          roomId: room.id,
          body: "Desk update https://example.com/story",
          senderName: "Automation",
        },
        null,
        2,
      ),
    [room.id],
  );

  const authHeader = useMemo(
    () => `Authorization: Bearer ${freshSecret || "<CHAT_WEBHOOK_SECRET>"}`,
    [freshSecret],
  );

  const curl = useMemo(
    () =>
      [
        `curl -X POST "${webhookPath}" \\`,
        `  -H "Authorization: Bearer ${freshSecret || "<paste-secret-here>"}" \\`,
        `  -H "Content-Type: application/json" \\`,
        `  -d '${JSON.stringify({
          roomId: room.id,
          body: "Desk update https://example.com/story",
          senderName: "Automation",
        })}'`,
      ].join("\n"),
    [webhookPath, room.id, freshSecret],
  );

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(""), 1600);
    } catch {
      setCopied("");
    }
  }

  function rotateSecret() {
    setSecretError("");
    startSecretTransition(async () => {
      const result = await rotateChatWebhookSecret();
      if (result.error || !result.secret) {
        setSecretError(result.error || "Could not generate secret.");
        return;
      }
      setFreshSecret(result.secret);
      setRevealSecret(true);
      setSecretStatus(result.status);
      void copy("secret", result.secret);
    });
  }

  function revokeSecret() {
    setSecretError("");
    startSecretTransition(async () => {
      const result = await revokeChatWebhookSecret();
      if (result.error) {
        setSecretError(result.error);
        return;
      }
      setFreshSecret(null);
      setRevealSecret(false);
      setSecretStatus(result.status);
    });
  }

  if (!open) return null;

  return (
    <div className="staff-chat-modal-root" role="presentation" onClick={onClose}>
      <div
        className="staff-chat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="staff-chat-modal-head">
          <div>
            <h3 id={titleId}>
              {tr({ en: "Group settings", kn: "ಗುಂಪು ಸೆಟ್ಟಿಂಗ್‌ಗಳು", hi: "समूह सेटिंग" })}
            </h3>
            <p>{room.name}</p>
          </div>
          <button type="button" className="staff-chat-modal-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <nav className="staff-chat-modal-tabs" aria-label="Settings sections">
          <button
            type="button"
            className={tab === "notifications" ? "is-active" : undefined}
            onClick={() => setTab("notifications")}
          >
            <Bell size={14} aria-hidden="true" />
            {tr({ en: "Notifications", kn: "ಅಧಿಸೂಚನೆಗಳು", hi: "सूचनाएँ" })}
          </button>
          {isAdmin ? (
            <>
              <button
                type="button"
                className={tab === "members" ? "is-active" : undefined}
                onClick={() => setTab("members")}
              >
                <Users size={14} aria-hidden="true" />
                {tr({ en: "Members", kn: "ಸದಸ್ಯರು", hi: "सदस्य" })}
              </button>
              <button
                type="button"
                className={tab === "api" ? "is-active" : undefined}
                onClick={() => setTab("api")}
              >
                <Webhook size={14} aria-hidden="true" />
                {tr({ en: "Webhook & API", kn: "ವೆಬ್‌ಹುಕ್ & API", hi: "वेबहुक और API" })}
              </button>
              <button
                type="button"
                className={tab === "danger" ? "is-active" : undefined}
                onClick={() => setTab("danger")}
              >
                <Trash2 size={14} aria-hidden="true" />
                {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
              </button>
            </>
          ) : null}
        </nav>

        <div className="staff-chat-modal-body">
          {tab === "notifications" ? (
            <div className="staff-chat-modal-pane">
              <p className="staff-chat-modal-lead">
                {tr({
                  en: "Control chat alerts for other browser tabs and admin pages. Available to Staff and Super Admin.",
                  kn: "ಇತರ ಬ್ರೌಸರ್ ಟ್ಯಾಬ್ ಮತ್ತು ಅಡ್ಮಿನ್ ಪುಟಗಳಿಗೆ ಚಾಟ್ ಅಧಿಸೂಚನೆಗಳನ್ನು ನಿಯಂತ್ರಿಸಿ. ಸಿಬ್ಬಂದಿ ಮತ್ತು ಸೂಪರ್ ಅಡ್ಮಿನ್‌ಗೆ ಲಭ್ಯ.",
                  hi: "अन्य ब्राउज़र टैब और एडमिन पेजों के लिए चैट अलर्ट नियंत्रित करें। स्टाफ़ और सुपर एडमिन के लिए उपलब्ध।",
                })}
              </p>

              <div className="staff-chat-notify-panel is-settings">
                {notifyPerm === "default" ? (
                  <button
                    type="button"
                    className="button button-ghost staff-chat-notify-btn"
                    onClick={() => {
                      unlockChatSound();
                      void ensureChatNotificationPermission().then((ok) => {
                        setNotifyPerm(ok ? "granted" : chatNotificationPermission());
                      });
                    }}
                  >
                    {tr({
                      en: "Enable desktop notifications",
                      kn: "ಡೆಸ್ಕ್‌ಟಾಪ್ ಅಧಿಸೂಚನೆಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
                      hi: "डेस्कटॉप सूचनाएँ चालू करें",
                    })}
                  </button>
                ) : notifyPerm === "denied" ? (
                  <p className="staff-chat-notify-hint">
                    {tr({
                      en: "Desktop alerts are blocked in this browser. Sound still works.",
                      kn: "ಈ ಬ್ರೌಸರ್‌ನಲ್ಲಿ ಡೆಸ್ಕ್‌ಟಾಪ್ ಅಧಿಸೂಚನೆ ನಿರ್ಬಂಧಿಸಲಾಗಿದೆ. ಧ್ವನಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ.",
                      hi: "इस ब्राउज़र में डेस्कटॉप अलर्ट बंद हैं। ध्वनि काम करेगी।",
                    })}
                  </p>
                ) : notifyPerm === "granted" ? (
                  <p className="staff-chat-notify-hint is-on">
                    {tr({
                      en: "Alerts on for other tabs and admin pages.",
                      kn: "ಇತರ ಟ್ಯಾಬ್/ಅಡ್ಮಿನ್ ಪುಟಗಳಿಗೆ ಅಧಿಸೂಚನೆ ಸಕ್ರಿಯ.",
                      hi: "अन्य टैब और एडमिन पेजों पर अलर्ट चालू।",
                    })}
                  </p>
                ) : null}

                <label className="staff-chat-volume">
                  <span>
                    <Volume2 size={14} aria-hidden="true" />
                    {tr({ en: "Alert volume", kn: "ಅಧಿಸೂಚನೆ ಧ್ವನಿ", hi: "अलर्ट वॉल्यूम" })}
                    <em>{notifyVolume}%</em>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={notifyVolume}
                    aria-label={tr({
                      en: "Chat alert volume",
                      kn: "ಚಾಟ್ ಅಧಿಸೂಚನೆ ಧ್ವನಿ",
                      hi: "चैट अलर्ट वॉल्यूम",
                    })}
                    onChange={(e) => {
                      const next = setChatNotifyVolume(Number(e.target.value));
                      setNotifyVolume(next);
                    }}
                    onPointerUp={() => {
                      unlockChatSound();
                      playChatNotifySound({ preview: true });
                    }}
                    onKeyUp={(e) => {
                      if (
                        e.key === "ArrowLeft" ||
                        e.key === "ArrowRight" ||
                        e.key === "Home" ||
                        e.key === "End"
                      ) {
                        unlockChatSound();
                        playChatNotifySound({ preview: true });
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="button button-ghost staff-chat-volume-test"
                    onClick={() => {
                      unlockChatSound();
                      playChatNotifySound({ preview: true });
                    }}
                  >
                    {tr({ en: "Test sound", kn: "ಧ್ವನಿ ಪರೀಕ್ಷಿಸಿ", hi: "ध्वनि जाँच" })}
                  </button>
                </label>
              </div>
            </div>
          ) : null}

          {tab === "members" && isAdmin ? (
            <div className="staff-chat-modal-pane staff-chat-members-pane">
              <div className="staff-chat-members-toolbar">
                <p className="staff-chat-modal-lead">
                  {tr({
                    en: "Choose who can see and send messages in this group.",
                    kn: "ಈ ಗುಂಪಿನಲ್ಲಿ ಯಾರು ನೋಡಬಹುದು ಮತ್ತು ಕಳುಹಿಸಬಹುದು ಎಂದು ಆಯ್ಕೆಮಾಡಿ.",
                    hi: "चुनें कि इस समूह में कौन देख और भेज सकता है।",
                  })}
                </p>
                <span className="staff-chat-members-count">
                  {memberIds.length}/{staff.length}{" "}
                  {tr({ en: "selected", kn: "ಆಯ್ಕೆ", hi: "चयनित" })}
                </span>
              </div>
              {(() => {
                const admins = staff.filter((p) => p.role === "admin");
                const desk = staff.filter((p) => p.role !== "admin");
                const roleLabel = (role: ChatStaff["role"]) =>
                  role === "admin"
                    ? tr({ en: "Super Admin", kn: "ಸೂಪರ್ ಅಡ್ಮಿನ್", hi: "सुपर एडमिन" })
                    : tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" });
                const tone = (name: string) => {
                  let hash = 0;
                  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
                  return hash % 6;
                };
                const renderGroup = (title: string, people: ChatStaff[], kind: "admin" | "staff") =>
                  people.length ? (
                    <section className="staff-chat-member-section" key={kind}>
                      <h4>
                        <span className="staff-chat-member-section-label">{title}</span>
                        <span className="staff-chat-member-section-count">
                          {people.filter((p) => memberIds.includes(p.id)).length}/{people.length}
                        </span>
                      </h4>
                      <ul className="staff-chat-member-list">
                        {people.map((person) => {
                          const checked = memberIds.includes(person.id);
                          return (
                            <li key={person.id}>
                              <label
                                className={
                                  "staff-chat-member-row" +
                                  (checked ? " is-selected" : "") +
                                  (kind === "admin" ? " is-admin" : " is-staff")
                                }
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setMemberIds((current) =>
                                      checked
                                        ? current.filter((id) => id !== person.id)
                                        : [...current, person.id],
                                    )
                                  }
                                />
                                <span
                                  className={`staff-chat-person-avatar tone-${tone(person.name)}`}
                                  aria-hidden="true"
                                >
                                  <svg viewBox="0 0 40 40" width="40" height="40" focusable="false">
                                    <circle className="plate" cx="20" cy="20" r="20" />
                                    <circle className="head" cx="20" cy="15.5" r="7" />
                                    <ellipse className="shoulders" cx="20" cy="34" rx="13" ry="9" />
                                  </svg>
                                </span>
                                <span className="staff-chat-person-meta">
                                  <strong title={person.name}>{person.name}</strong>
                                  <small>{roleLabel(person.role)}</small>
                                </span>
                                <span className="staff-chat-person-check" aria-hidden="true">
                                  {checked ? <Check size={14} strokeWidth={2.75} /> : null}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ) : null;

                return (
                  <div className="staff-chat-member-groups">
                    {renderGroup(
                      tr({ en: "Super Admins", kn: "ಸೂಪರ್ ಅಡ್ಮಿನ್‌ಗಳು", hi: "सुपर एडमिन" }),
                      admins,
                      "admin",
                    )}
                    {renderGroup(
                      tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" }),
                      desk,
                      "staff",
                    )}
                  </div>
                );
              })()}
              <div className="staff-chat-modal-actions">
                <button
                  type="button"
                  className="button button-ember"
                  disabled={pending}
                  onClick={() => onSaveMembers(memberIds)}
                >
                  {tr({ en: "Save members", kn: "ಸದಸ್ಯರನ್ನು ಉಳಿಸಿ", hi: "सदस्य सहेजें" })}
                </button>
              </div>
            </div>
          ) : null}

          {tab === "api" && isAdmin ? (
            <div className="staff-chat-modal-pane">
              <p className="staff-chat-modal-lead">
                {tr({
                  en: "Post text or an https URL into this group from another system using the live webhook below.",
                  kn: "ಕೆಳಗಿನ ಲೈವ್ ವೆಬ್‌ಹುಕ್ ಬಳಸಿ ಬೇರೆ ವ್ಯವಸ್ಥೆಯಿಂದ ಈ ಗುಂಪಿಗೆ ಪಠ್ಯ ಅಥವಾ https URL ಕಳುಹಿಸಿ.",
                  hi: "नीचे दिए लाइव वेबहुक से दूसरे सिस्टम से इस समूह में टेक्स्ट या https URL भेजें।",
                })}
              </p>

              <section className="staff-chat-secret-panel">
                <div className="staff-chat-secret-head">
                  <div>
                    <h4>
                      <KeyRound size={15} aria-hidden="true" />
                      {tr({ en: "Webhook secret", kn: "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್", hi: "वेबहुक सीक्रेट" })}
                    </h4>
                    <p>
                      {secretStatus?.configured
                        ? tr({
                            en: "Active — requests must send this Bearer token.",
                            kn: "ಸಕ್ರಿಯ — ವಿನಂತಿಗಳು ಈ Bearer ಟೋಕನ್ ಕಳುಹಿಸಬೇಕು.",
                            hi: "सक्रिय — अनुरोधों में यह Bearer टोकन चाहिए।",
                          })
                        : tr({
                            en: "Not configured — generate a secret to enable the webhook.",
                            kn: "ಕಾನ್ಫಿಗರ್ ಆಗಿಲ್ಲ — ವೆಬ್‌ಹುಕ್ ಸಕ್ರಿಯಗೊಳಿಸಲು ಸೀಕ್ರೆಟ್ ರಚಿಸಿ.",
                            hi: "कॉन्फ़िगर नहीं — वेबहुक चालू करने के लिए सीक्रेट बनाएँ।",
                          })}
                    </p>
                  </div>
                  <span
                    className={
                      "staff-chat-secret-badge" + (secretStatus?.configured ? " is-on" : "")
                    }
                  >
                    {secretStatus?.configured
                      ? tr({ en: "Live", kn: "ಲೈವ್", hi: "लाइव" })
                      : tr({ en: "Off", kn: "ಆಫ್", hi: "बंद" })}
                  </span>
                </div>

                <div className="staff-chat-secret-meta">
                  <span>
                    {tr({ en: "Hint", kn: "ಸೂಚನೆ", hi: "संकेत" })}:{" "}
                    <code>{secretStatus?.hint || "—"}</code>
                  </span>
                  <span>
                    {tr({ en: "Source", kn: "ಮೂಲ", hi: "स्रोत" })}:{" "}
                    {secretStatus?.source === "database"
                      ? tr({ en: "Admin generated", kn: "ಅಡ್ಮಿನ್ ರಚಿಸಿದ್ದು", hi: "एडमिन जनरेटेड" })
                      : secretStatus?.source === "env"
                        ? "CHAT_WEBHOOK_SECRET"
                        : secretStatus?.source === "both"
                          ? tr({ en: "Admin + env", kn: "ಅಡ್ಮಿನ್ + env", hi: "एडमिन + env" })
                          : tr({ en: "None", kn: "ಇಲ್ಲ", hi: "नहीं" })}
                  </span>
                  {secretStatus?.rotatedAt ? (
                    <span>
                      {tr({ en: "Rotated", kn: "ತಿರುಗಿಸಲಾಗಿದೆ", hi: "रोटेट" })}:{" "}
                      {new Date(secretStatus.rotatedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>

                {freshSecret ? (
                  <div className="staff-chat-secret-reveal" role="status">
                    <p>
                      {tr({
                        en: "Copy this secret now. It is shown only once and never stored in plain text.",
                        kn: "ಈ ಸೀಕ್ರೆಟ್ ಅನ್ನು ಈಗ ನಕಲಿಸಿ. ಇದು ಒಮ್ಮೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ ಮತ್ತು ಪ್ಲೇನ್ ಟೆಕ್ಸ್ಟ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.",
                        hi: "इस सीक्रेट को अभी कॉपी करें। यह केवल एक बार दिखता है और सादे पाठ में नहीं रखा जाता।",
                      })}
                    </p>
                    <div className="staff-chat-secret-value">
                      <code>{revealSecret ? freshSecret : "•".repeat(Math.min(freshSecret.length, 44))}</code>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => setRevealSecret((v) => !v)}
                        aria-label={revealSecret ? "Hide secret" : "Show secret"}
                      >
                        {revealSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        type="button"
                        className="button button-ghost"
                        onClick={() => void copy("secret", freshSecret)}
                      >
                        {copied === "secret" ? <Check size={14} /> : <Copy size={14} />}
                        {copied === "secret"
                          ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                          : tr({ en: "Copy secret", kn: "ಸೀಕ್ರೆಟ್ ನಕಲಿಸಿ", hi: "सीक्रेट कॉपी" })}
                      </button>
                    </div>
                  </div>
                ) : null}

                {secretError ? (
                  <p className="staff-chat-modal-lead is-danger" role="alert">
                    {secretError}
                  </p>
                ) : null}

                <div className="staff-chat-secret-actions">
                  <button
                    type="button"
                    className="button button-ember"
                    disabled={secretBusy || pending}
                    onClick={rotateSecret}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    {secretStatus?.configured
                      ? tr({ en: "Rotate secret", kn: "ಸೀಕ್ರೆಟ್ ತಿರುಗಿಸಿ", hi: "सीक्रेट रोटेट करें" })
                      : tr({
                          en: "Generate webhook secret",
                          kn: "ವೆಬ್‌ಹುಕ್ ಸೀಕ್ರೆಟ್ ರಚಿಸಿ",
                          hi: "वेबहुक सीक्रेट बनाएँ",
                        })}
                  </button>
                  {secretStatus?.source === "database" || secretStatus?.source === "both" ? (
                    <button
                      type="button"
                      className="button button-ghost"
                      disabled={secretBusy || pending}
                      onClick={revokeSecret}
                    >
                      <ShieldOff size={15} aria-hidden="true" />
                      {tr({ en: "Revoke", kn: "ರದ್ದುಮಾಡಿ", hi: "रद्द करें" })}
                    </button>
                  ) : null}
                </div>
              </section>

              <label className="staff-chat-copy-field">
                <span>{tr({ en: "Group ID", kn: "ಗುಂಪು ID", hi: "समूह ID" })}</span>
                <div>
                  <code>{room.id}</code>
                  <button type="button" className="button button-ghost" onClick={() => void copy("id", room.id)}>
                    {copied === "id" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "id"
                      ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                      : tr({ en: "Copy", kn: "ನಕಲಿಸಿ", hi: "कॉपी" })}
                  </button>
                </div>
              </label>

              <label className="staff-chat-copy-field">
                <span>{tr({ en: "Webhook URL", kn: "ವೆಬ್‌ಹುಕ್ URL", hi: "वेबहुक URL" })}</span>
                <div>
                  <code>{webhookPath}</code>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => void copy("url", webhookPath)}
                  >
                    {copied === "url" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "url"
                      ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                      : tr({ en: "Copy", kn: "ನಕಲಿಸಿ", hi: "कॉपी" })}
                  </button>
                </div>
              </label>

              <label className="staff-chat-copy-field">
                <span>
                  <KeyRound size={14} aria-hidden="true" />{" "}
                  {tr({ en: "Auth header", kn: "ಅಧಿಕಾರ ಹೆಡರ್", hi: "ऑथ हेडर" })}
                </span>
                <div>
                  <code>{authHeader}</code>
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={!freshSecret}
                    onClick={() => void copy("auth", authHeader)}
                  >
                    {copied === "auth" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "auth"
                      ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                      : tr({ en: "Copy", kn: "ನಕಲಿಸಿ", hi: "कॉपी" })}
                  </button>
                </div>
              </label>

              <label className="staff-chat-copy-field">
                <span>{tr({ en: "JSON body", kn: "JSON ಬಾಡಿ", hi: "JSON बॉडी" })}</span>
                <div className="is-stack">
                  <pre>{sampleJson}</pre>
                  <button
                    type="button"
                    className="button button-ghost"
                    onClick={() => void copy("json", sampleJson)}
                  >
                    {copied === "json" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "json"
                      ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                      : tr({ en: "Copy JSON", kn: "JSON ನಕಲಿಸಿ", hi: "JSON कॉपी" })}
                  </button>
                </div>
              </label>

              <label className="staff-chat-copy-field">
                <span>{tr({ en: "Ready-to-run curl", kn: "ಬಳಸಲು ಸಿದ್ಧ curl", hi: "तैयार curl" })}</span>
                <div className="is-stack">
                  <pre>{curl}</pre>
                  <button
                    type="button"
                    className="button button-ghost"
                    disabled={!freshSecret}
                    onClick={() => void copy("curl", curl)}
                  >
                    {copied === "curl" ? <Check size={14} /> : <Copy size={14} />}
                    {copied === "curl"
                      ? tr({ en: "Copied", kn: "ನಕಲು", hi: "कॉपी" })
                      : tr({
                          en: "Copy curl with secret",
                          kn: "ಸೀಕ್ರೆಟ್‌ನೊಂದಿಗೆ curl ನಕಲಿಸಿ",
                          hi: "सीक्रेट के साथ curl कॉपी",
                        })}
                  </button>
                </div>
              </label>
            </div>
          ) : null}

          {tab === "danger" && isAdmin ? (
            <div className="staff-chat-modal-pane">
              <p className="staff-chat-modal-lead is-danger">
                {tr({
                  en: "Deleting this community removes the group, all members, and every message. This cannot be undone.",
                  kn: "ಈ ಸಮುದಾಯವನ್ನು ಅಳಿಸಿದರೆ ಗುಂಪು, ಸದಸ್ಯರು ಮತ್ತು ಎಲ್ಲಾ ಸಂದೇಶಗಳು ಹೋಗುತ್ತವೆ. ಇದನ್ನು ಹಿಂದಕ್ಕೆ ತೆಗೆಯಲಾಗುವುದಿಲ್ಲ.",
                  hi: "इस समुदाय को हटाने पर समूह, सदस्य और सभी संदेश हट जाएँगे। यह वापस नहीं होगा।",
                })}
              </p>
              <label className="field">
                <span>
                  {tr({
                    en: `Type "${room.name}" to confirm`,
                    kn: `ದೃಢೀಕರಿಸಲು "${room.name}" ಟೈಪ್ ಮಾಡಿ`,
                    hi: `पुष्टि के लिए "${room.name}" टाइप करें`,
                  })}
                </span>
                <input
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  placeholder={room.name}
                  autoComplete="off"
                />
              </label>
              <div className="staff-chat-modal-actions">
                <button
                  type="button"
                  className="button button-danger"
                  disabled={pending || confirmName.trim() !== room.name}
                  onClick={onDeleteGroup}
                >
                  <Trash2 size={16} aria-hidden="true" />
                  {tr({ en: "Delete community", kn: "ಸಮುದಾಯ ಅಳಿಸಿ", hi: "समुदाय हटाएँ" })}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
