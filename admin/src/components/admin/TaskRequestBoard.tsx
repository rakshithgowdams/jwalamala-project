"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Eye, MoreVertical, Pencil, RefreshCw, Send, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { PostThumb } from "@/components/admin/PostThumb";
import { site } from "@/config/site";
import type { Tri } from "@/lib/i18n/strings";
import { youtubeThumbnail } from "@/lib/utils/images";
import {
  cancelTaskRequest,
  completeTaskRequest,
  reviewTaskRequest,
  submitTaskRequestReady,
  type TaskRequestRow,
} from "@/app/admin/task-requests/actions";
import { useDeskPath } from "@/components/admin/DeskPathProvider";

const requestStatusNames: Record<string, Tri> = {
  requested: { en: "Requested", kn: "ವಿನಂತಿಸಲಾಗಿದೆ", hi: "अनुरोधित" },
  processing: { en: "Processing", kn: "ಸಂಸ್ಕರಣೆ", hi: "प्रोसेसिंग" },
  ready: { en: "Ready", kn: "ಸಿದ್ಧ", hi: "तैयार" },
  rejected: { en: "Rejected", kn: "ತಿರಸ್ಕೃತ", hi: "अस्वीकृत" },
  done: { en: "Done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण" },
  cancelled: { en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" },
};

type SectionKey = "request" | "process" | "completed";

const SECTION_STATUSES: Record<SectionKey, string[]> = {
  request: ["requested", "rejected"],
  process: ["processing", "ready"],
  // Cancelled stays visible here with a Cancelled pill — it used to disappear from every tab.
  completed: ["done", "cancelled"],
};

function cardThumbnail(thumbnail: string | null, video: string | null) {
  const cover = (thumbnail || "").trim();
  const fromVideo = video ? youtubeThumbnail(video) : null;
  const logo = !cover || cover.includes("jwalamala-logo");
  if (logo && fromVideo) return fromVideo;
  return (cover || fromVideo || "/images/jwalamala-logo.jpg").replace(
    "/maxresdefault.jpg",
    "/hqdefault.jpg",
  );
}

function statusPillClass(status: string) {
  if (status === "ready" || status === "done") return "published";
  if (status === "processing") return "scheduled";
  if (status === "rejected" || status === "cancelled") return "archived";
  return "draft";
}

type Props = {
  isAdmin: boolean;
  requests: TaskRequestRow[];
  staff: { id: string; name: string }[];
};

export function TaskRequestBoard({ isAdmin, requests, staff }: Props) {
  const { tr } = useUiStrings();
  const router = useRouter();
  const basePath = useDeskPath();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [section, setSection] = useState<SectionKey>(() => {
    if (isAdmin) return "request";
    if (requests.some((row) => SECTION_STATUSES.process.includes(row.status))) return "process";
    return "request";
  });
  const [filterStaff, setFilterStaff] = useState("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function closeMenu() {
    setMenuOpenId(null);
    setMenuPos(null);
  }

  function placeMenu(button: HTMLButtonElement, panel?: HTMLElement | null) {
    const rect = button.getBoundingClientRect();
    const panelWidth = Math.max(panel?.offsetWidth || 0, 200);
    const panelHeight = Math.max(panel?.offsetHeight || 0, 180);
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
      closeMenu();
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
      closeMenu();
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeMenu();
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

  useEffect(() => {
    if (!detailId && !reviewId) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || pending) return;
      setDetailId(null);
      if (!pending) setReviewId(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [detailId, reviewId, pending]);

  const counts = useMemo(() => {
    const byStaff = (row: TaskRequestRow) =>
      filterStaff === "all" || row.requesterId === filterStaff;
    return {
      request: requests.filter((r) => byStaff(r) && SECTION_STATUSES.request.includes(r.status)).length,
      process: requests.filter((r) => byStaff(r) && SECTION_STATUSES.process.includes(r.status)).length,
      completed: requests.filter((r) => byStaff(r) && SECTION_STATUSES.completed.includes(r.status)).length,
    };
  }, [requests, filterStaff]);

  const visible = useMemo(() => {
    const allowed = SECTION_STATUSES[section];
    return requests.filter((row) => {
      if (filterStaff !== "all" && row.requesterId !== filterStaff) return false;
      return allowed.includes(row.status);
    });
  }, [requests, section, filterStaff]);

  function run(
    action: () => Promise<{ ok?: true; error?: string }>,
    okMsg: string,
    opts?: { goCompleted?: boolean },
  ) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        setMessage({ ok: okMsg });
        setReviewId(null);
        setDetailId(null);
        setDriveUrl("");
        setAdminNote("");
        if (opts?.goCompleted) setSection("completed");
        router.refresh();
      }
    });
  }

  const reviewing = reviewId ? requests.find((r) => r.id === reviewId) : null;

  const sectionLead =
    section === "request"
      ? isAdmin
        ? tr({
            en: "New staff verification requests waiting for a Drive link and approval.",
            kn: "Drive ಲಿಂಕ್ ಮತ್ತು ಅನುಮೋದನೆಗಾಗಿ ಕಾಯುತ್ತಿರುವ ಹೊಸ ಸಿಬ್ಬಂದಿ ಪರಿಶೀಲನಾ ವಿನಂತಿಗಳು.",
            hi: "Drive लिंक और स्वीकृति की प्रतीक्षा में नए स्टाफ़ सत्यापन अनुरोध।",
          })
        : tr({
            en: "Your requests waiting for admin review. Rejected items can be requested again from Tasks.",
            kn: "ಆಡ್ಮಿನ್ ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯುತ್ತಿರುವ ನಿಮ್ಮ ವಿನಂತಿಗಳು. ತಿರಸ್ಕೃತವನ್ನು Tasks ನಿಂದ ಮತ್ತೆ ವಿನಂತಿಸಬಹುದು.",
            hi: "एडमिन समीक्षा की प्रतीक्षा में आपके अनुरोध। अस्वीकृत को Tasks से फिर अनुरोध करें।",
          })
      : section === "process"
        ? isAdmin
          ? tr({
              en: "Approved work in progress. When staff marks ready, publish the article to complete the request.",
              kn: "ಅನುಮೋದಿತ ಕೆಲಸ ನಡೆಯುತ್ತಿದೆ. ಸಿಬ್ಬಂದಿ ಸಿದ್ಧ ಎಂದಾಗ ಲೇಖನ ಪ್ರಕಟಿಸಿ ವಿನಂತಿ ಪೂರ್ಣಗೊಳ್ಳುತ್ತದೆ.",
              hi: "स्वीकृत कार्य जारी है। स्टाफ़ तैयार चिह्नित करे तो लेख प्रकाशित कर अनुरोध पूरा होता है।",
            })
          : tr({
              en: "Admin approved — open Drive, finish the article, then send it back for publish.",
              kn: "ಆಡ್ಮಿನ್ ಅನುಮೋದಿಸಿದ್ದಾರೆ — Drive ತೆರೆಯಿರಿ, ಲೇಖನ ಮುಗಿಸಿ, ಪ್ರಕಟಣೆಗೆ ಕಳುಹಿಸಿ.",
              hi: "एडमिन ने स्वीकृत किया — Drive खोलें, लेख पूरा करें, प्रकाशन के लिए भेजें।",
            })
        : tr({
            en: "Finished verification work — Done and Cancelled requests stay listed here with their status on the card.",
            kn: "ಮುಗಿದ ಪರಿಶೀಲನೆ — ಮುಗಿದಿದೆ ಮತ್ತು ರದ್ದು ವಿನಂತಿಗಳು ಇಲ್ಲಿ ಸ್ಥಿತಿ ಪಿಲ್‌ನೊಂದಿಗೆ ಕಾಣುತ್ತವೆ.",
            hi: "समाप्त सत्यापन — पूर्ण और रद्द अनुरोध यहाँ कार्ड पर स्थिति के साथ दिखते हैं।",
          });

  const detailRow = detailId ? requests.find((r) => r.id === detailId) : null;
  const menuRow = menuOpenId ? visible.find((r) => r.id === menuOpenId) : null;
  const stamped = useMemo(
    () =>
      new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "Asia/Kolkata",
      }),
    [],
  );

  const sections: { key: SectionKey; label: Tri }[] = [
    { key: "request", label: { en: "Request", kn: "ವಿನಂತಿ", hi: "अनुरोध" } },
    { key: "process", label: { en: "In process", kn: "ಪ್ರಕ್ರಿಯೆಯಲ್ಲಿ", hi: "प्रक्रिया में" } },
    { key: "completed", label: { en: "Completed", kn: "ಪೂರ್ಣ", hi: "पूर्ण" } },
  ];

  return (
    <div className="task-request-board">
      {message.error ? <p role="alert">{message.error}</p> : null}
      {message.ok ? <p role="status">{message.ok}</p> : null}

      <section className="panel task-request-panel">
        <div className="task-request-toolbar">
          <h2>{tr({ en: "Task requests", kn: "ಕಾರ್ಯ ವಿನಂತಿಗಳು", hi: "कार्य अनुरोध" })}</h2>
          <div className="task-request-filters">
            {isAdmin && staff.length ? (
              <label className="field" style={{ margin: 0 }}>
                <span className="sr-only">
                  {tr({ en: "Staff filter", kn: "ಸಿಬ್ಬಂದಿ ಫಿಲ್ಟರ್", hi: "स्टाफ़ फ़िल्टर" })}
                </span>
                <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)}>
                  <option value="all">{tr({ en: "All staff", kn: "ಎಲ್ಲಾ ಸಿಬ್ಬಂದಿ", hi: "सभी स्टाफ़" })}</option>
                  {staff.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button
              type="button"
              className="button button-outline is-compact task-refresh-btn"
              disabled={pending}
              onClick={() => {
                setMessage({});
                start(() => {
                  router.refresh();
                });
              }}
            >
              <RefreshCw size={15} aria-hidden="true" />
              {tr({ en: "Refresh", kn: "ರಿಫ್ರೆಶ್", hi: "रिफ़्रेश" })}
            </button>
          </div>
        </div>

        <div className="task-request-sections" role="tablist" aria-label={tr({ en: "Request stages", kn: "ವಿನಂತಿ ಹಂತಗಳು", hi: "अनुरोध चरण" })}>
          {sections.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={section === item.key}
              className={"task-request-section-tab" + (section === item.key ? " is-active" : "")}
              onClick={() => setSection(item.key)}
            >
              <span>{tr(item.label)}</span>
              <span className="task-request-section-count">{counts[item.key]}</span>
            </button>
          ))}
        </div>

        <p className="task-request-lead">{sectionLead}</p>

        {!visible.length ? (
          <p>
            {tr({
              en: "Nothing in this section yet.",
              kn: "ಈ ವಿಭಾಗದಲ್ಲಿ ಇನ್ನೂ ಏನೂ ಇಲ್ಲ.",
              hi: "इस अनुभाग में अभी कुछ नहीं।",
            })}
          </p>
        ) : (
          <div className="post-card-list">
            {visible.map((row, index) => {
              const menuOpen = menuOpenId === row.id;
              return (
                <article
                  key={row.id}
                  className={
                    "post-card task-request-card is-" +
                    (row.status === "cancelled" || row.status === "rejected"
                      ? "archived"
                      : row.status === "done"
                        ? "published"
                        : row.postStatus || "draft") +
                    (menuOpen ? " is-menu-open" : "")
                  }
                  style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
                >
                  <div className="post-card-thumb">
                    <PostThumb src={cardThumbnail(row.thumbnail, row.videoUrl)} eager={index < 6} />
                    <div className="post-card-badges">
                      <span className={"status-pill is-" + statusPillClass(row.status)}>
                        {requestStatusNames[row.status]
                          ? tr(requestStatusNames[row.status])
                          : row.status}
                      </span>
                    </div>
                  </div>
                  <div className="post-card-body">
                    <div className="task-request-card-top">
                      <h2>
                        <Link href={`${basePath}/posts/${row.postId}`} prefetch={false}>
                          {row.title || row.postId}
                        </Link>
                      </h2>
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
                      {isAdmin ? (
                        <>
                          <strong>{row.requesterName}</strong>
                          {" · "}
                        </>
                      ) : null}
                      {row.staffNote ||
                        tr({ en: "No staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ ಇಲ್ಲ", hi: "स्टाफ़ नोट नहीं" })}
                    </p>
                    {row.adminNote ? (
                      <p className="task-request-admin-note">
                        <strong>
                          {row.status === "rejected"
                            ? tr({ en: "Rejection note", kn: "ತಿರಸ್ಕಾರ ಟಿಪ್ಪಣಿ", hi: "अस्वीकृति नोट" })
                            : row.status === "cancelled"
                              ? tr({ en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" })
                              : tr({ en: "Admin", kn: "ಆಡ್ಮಿನ್", hi: "एडमिन" })}
                          :
                        </strong>{" "}
                        {row.adminNote}
                      </p>
                    ) : null}
                    {row.driveUrl ? (
                      <p className="task-request-drive">
                        <a href={row.driveUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} aria-hidden="true" />
                          {tr({ en: "Open Drive link", kn: "Drive ಲಿಂಕ್ ತೆರೆಯಿರಿ", hi: "Drive लिंक खोलें" })}
                        </a>
                      </p>
                    ) : null}

                    <div className="post-actions">
                      {isAdmin && (row.status === "requested" || row.status === "rejected") ? (
                        <button
                          type="button"
                          className="button is-compact"
                          disabled={pending}
                          onClick={() => {
                            setReviewId(row.id);
                            setDriveUrl(row.driveUrl || "");
                            setAdminNote(row.adminNote || "");
                          }}
                        >
                          <Check size={15} aria-hidden="true" />
                          {tr({ en: "Review", kn: "ಪರಿಶೀಲಿಸಿ", hi: "समीक्षा" })}
                        </button>
                      ) : null}

                      {!isAdmin && row.status === "processing" ? (
                        <button
                          type="button"
                          className="button is-compact"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => submitTaskRequestReady({ id: row.id }),
                              tr({
                                en: "Sent to admin for publish.",
                                kn: "ಪ್ರಕಟಣೆಗಾಗಿ ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಲಾಯಿತು.",
                                hi: "प्रकाशन के लिए एडमिन को भेजा।",
                              }),
                            )
                          }
                        >
                          <Send size={15} aria-hidden="true" />
                          {tr({ en: "Send to admin", kn: "ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಿ", hi: "एडमिन को भेजें" })}
                        </button>
                      ) : null}

                      {isAdmin && row.status === "ready" ? (
                        <button
                          type="button"
                          className="button is-compact"
                          disabled={pending}
                          onClick={() =>
                            run(
                              () => completeTaskRequest({ id: row.id }),
                              tr({
                                en: "Moved to Completed.",
                                kn: "ಪೂರ್ಣ ವಿಭಾಗಕ್ಕೆ ಸರಿಸಲಾಯಿತು.",
                                hi: "पूर्ण अनुभाग में भेजा।",
                              }),
                            )
                          }
                        >
                          <Check size={15} aria-hidden="true" />
                          {tr({ en: "Mark done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण चिह्नित" })}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {menuRow && menuPos && typeof document !== "undefined"
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
                onClick={() => {
                  const id = menuRow.id;
                  closeMenu();
                  setDetailId(id);
                }}
              >
                <Eye size={15} aria-hidden="true" />
                {tr({ en: "Details", kn: "ವಿವರ", hi: "विवरण" })}
              </button>
              <Link
                href={`${basePath}/posts/${menuRow.postId}`}
                prefetch={false}
                role="menuitem"
                onClick={closeMenu}
              >
                <Pencil size={15} aria-hidden="true" />
                {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
              </Link>
              {menuRow.postStatus === "published" && menuRow.slug ? (
                <a
                  href={`${site.url}/news/${menuRow.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onClick={closeMenu}
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                </a>
              ) : (
                <button type="button" role="menuitem" disabled>
                  <ExternalLink size={15} aria-hidden="true" />
                  {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                </button>
              )}
              {(isAdmin &&
                ["requested", "processing", "ready", "rejected"].includes(menuRow.status)) ||
              (!isAdmin && menuRow.status === "requested") ? (
                <button
                  type="button"
                  role="menuitem"
                  className="is-danger"
                  disabled={pending}
                  onClick={() => {
                    const id = menuRow.id;
                    closeMenu();
                    run(
                      () => cancelTaskRequest({ id }),
                      tr({
                        en: "Request cancelled — see Completed tab.",
                        kn: "ವಿನಂತಿ ರದ್ದು — ಪೂರ್ಣ ಟ್ಯಾಬ್ ನೋಡಿ.",
                        hi: "अनुरोध रद्द — पूर्ण टैब देखें।",
                      }),
                      { goCompleted: true },
                    );
                  }}
                >
                  <X size={15} aria-hidden="true" />
                  {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
                </button>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {detailRow ? (
        <div
          className="staff-chat-modal-root"
          role="presentation"
          onClick={() => setDetailId(null)}
        >
          <div
            className="staff-chat-modal task-detail-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="request-detail-title"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="staff-chat-modal-head">
              <div>
                <h2 id="request-detail-title">
                  {tr({ en: "Request details", kn: "ವಿನಂತಿ ವಿವರ", hi: "अनुरोध विवरण" })}
                </h2>
                <p className="staff-chat-modal-lead">{detailRow.title}</p>
              </div>
              <button
                type="button"
                className="button button-outline is-compact"
                onClick={() => setDetailId(null)}
              >
                {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
              </button>
            </header>
            <div className="confirm-dialog-preview">
              <span className="confirm-dialog-thumb">
                <PostThumb src={cardThumbnail(detailRow.thumbnail, detailRow.videoUrl)} eager />
              </span>
              <div>
                <strong>{detailRow.title || detailRow.postId}</strong>
                <small>
                  <span className={"status-pill is-" + statusPillClass(detailRow.status)}>
                    {requestStatusNames[detailRow.status]
                      ? tr(requestStatusNames[detailRow.status])
                      : detailRow.status}
                  </span>
                </small>
              </div>
            </div>
            <dl className="task-detail-grid">
              <div>
                <dt>{tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" })}</dt>
                <dd>{detailRow.requesterName}</dd>
              </div>
              <div>
                <dt>{tr({ en: "Article status", kn: "ಲೇಖನ ಸ್ಥಿತಿ", hi: "लेख स्थिति" })}</dt>
                <dd>{detailRow.postStatus || "—"}</dd>
              </div>
              <div>
                <dt>{tr({ en: "Staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ", hi: "स्टाफ़ नोट" })}</dt>
                <dd>{detailRow.staffNote || "—"}</dd>
              </div>
              <div>
                <dt>{tr({ en: "Admin note", kn: "ಆಡ್ಮಿನ್ ಟಿಪ್ಪಣಿ", hi: "एडमिन नोट" })}</dt>
                <dd>{detailRow.adminNote || "—"}</dd>
              </div>
              <div>
                <dt>{tr({ en: "Drive link", kn: "Drive ಲಿಂಕ್", hi: "Drive लिंक" })}</dt>
                <dd>
                  {detailRow.driveUrl ? (
                    <a href={detailRow.driveUrl} target="_blank" rel="noopener noreferrer">
                      {detailRow.driveUrl}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt>{tr({ en: "Requested", kn: "ವಿನಂತಿ", hi: "अनुरोध" })}</dt>
                <dd>
                  {detailRow.createdAt ? stamped.format(new Date(detailRow.createdAt)) : "—"}
                </dd>
              </div>
              <div>
                <dt>{tr({ en: "Reviewed", kn: "ಪರಿಶೀಲನೆ", hi: "समीक्षा" })}</dt>
                <dd>
                  {detailRow.reviewedAt ? stamped.format(new Date(detailRow.reviewedAt)) : "—"}
                </dd>
              </div>
              <div>
                <dt>{tr({ en: "Ready", kn: "ಸಿದ್ಧ", hi: "तैयार" })}</dt>
                <dd>{detailRow.readyAt ? stamped.format(new Date(detailRow.readyAt)) : "—"}</dd>
              </div>
            </dl>
            <div className="staff-chat-modal-actions">
              <Link
                href={`${basePath}/posts/${detailRow.postId}`}
                prefetch={false}
                className="button button-outline"
                onClick={() => setDetailId(null)}
              >
                {tr({ en: "Open article", kn: "ಲೇಖನ ತೆರೆಯಿರಿ", hi: "लेख खोलें" })}
              </Link>
              <button type="button" className="button" onClick={() => setDetailId(null)}>
                {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {reviewing ? (
        <div
          className="staff-chat-modal-root"
          role="presentation"
          onClick={() => !pending && setReviewId(null)}
        >
          <form
            className="staff-chat-modal"
            role="dialog"
            aria-modal="true"
            aria-label={tr({ en: "Review request", kn: "ವಿನಂತಿ ಪರಿಶೀಲನೆ", hi: "अनुरोध समीक्षा" })}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => e.preventDefault()}
          >
            <header className="staff-chat-modal-head">
              <div>
                <h2>{tr({ en: "Review request", kn: "ವಿನಂತಿ ಪರಿಶೀಲನೆ", hi: "अनुरोध समीक्षा" })}</h2>
                <p className="staff-chat-modal-lead">{reviewing.title}</p>
              </div>
              <button type="button" className="button button-outline is-compact" onClick={() => setReviewId(null)}>
                {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
              </button>
            </header>
            <label className="field">
              <span>{tr({ en: "Google Drive link", kn: "Google Drive ಲಿಂಕ್", hi: "Google Drive लिंक" })}</span>
              <input
                type="url"
                value={driveUrl}
                onChange={(e) => setDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                required
              />
            </label>
            <label className="field">
              <span>{tr({ en: "Admin note", kn: "ಆಡ್ಮಿನ್ ಟಿಪ್ಪಣಿ", hi: "एडमिन नोट" })}</span>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={tr({
                  en: "Optional note for staff",
                  kn: "ಸಿಬ್ಬಂದಿಗೆ ಐಚ್ಛಿಕ ಟಿಪ್ಪಣಿ",
                  hi: "स्टाफ़ के लिए वैकल्पिक नोट",
                })}
              />
            </label>
            <div className="staff-chat-modal-actions">
              <button
                type="button"
                className="button button-outline"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      reviewTaskRequest({
                        id: reviewing.id,
                        decision: "reject",
                        adminNote,
                        driveUrl: "",
                      }),
                    tr({
                      en: "Request rejected — stays in Request with Rejected on the card.",
                      kn: "ವಿನಂತಿ ತಿರಸ್ಕೃತ — ವಿನಂತಿ ಟ್ಯಾಬ್‌ನಲ್ಲಿ ತಿರಸ್ಕೃತ ಪಿಲ್‌ನೊಂದಿಗೆ ಉಳಿಯುತ್ತದೆ.",
                      hi: "अनुरोध अस्वीकृत — अनुरोध टैब में अस्वीकृत पिल के साथ रहेगा।",
                    }),
                  )
                }
              >
                {tr({ en: "Reject", kn: "ತಿರಸ್ಕರಿಸಿ", hi: "अस्वीकार" })}
              </button>
              <button
                type="button"
                className="button"
                disabled={pending || !driveUrl.trim()}
                onClick={() =>
                  run(
                    () =>
                      reviewTaskRequest({
                        id: reviewing.id,
                        decision: "approve",
                        adminNote,
                        driveUrl,
                      }),
                    tr({
                      en: "Approved — moved to In process.",
                      kn: "ಅನುಮೋದಿಸಲಾಯಿತು — ಪ್ರಕ್ರಿಯೆಗೆ ಸರಿಸಲಾಯಿತು.",
                      hi: "स्वीकृत — प्रक्रिया में भेजा।",
                    }),
                  )
                }
              >
                {tr({ en: "Approve", kn: "ಅನುಮೋದಿಸಿ", hi: "स्वीकृत" })}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
