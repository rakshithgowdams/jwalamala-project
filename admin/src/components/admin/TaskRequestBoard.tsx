"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, RefreshCw, Send, X } from "lucide-react";
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
  completed: ["done"],
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
  const [driveUrl, setDriveUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");

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

  function run(action: () => Promise<{ ok?: true; error?: string }>, okMsg: string) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        setMessage({ ok: okMsg });
        setReviewId(null);
        setDriveUrl("");
        setAdminNote("");
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
            en: "Published articles whose verification request is finished.",
            kn: "ಪ್ರಕಟಿತ ಲೇಖನಗಳು — ಪರಿಶೀಲನಾ ವಿನಂತಿ ಮುಗಿದಿದೆ.",
            hi: "प्रकाशित लेख जिनका सत्यापन अनुरोध पूरा हो चुका है।",
          });

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
            {visible.map((row, index) => (
              <article
                key={row.id}
                className={"post-card is-" + (row.postStatus || "draft")}
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
                  <h2>
                    <Link href={`${basePath}/posts/${row.postId}`} prefetch={false}>
                      {row.title || row.postId}
                    </Link>
                  </h2>
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
                      <strong>{tr({ en: "Admin", kn: "ಆಡ್ಮಿನ್", hi: "एडमिन" })}:</strong>{" "}
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
                    <Link
                      href={`${basePath}/posts/${row.postId}`}
                      prefetch={false}
                      className="button button-outline is-compact"
                    >
                      <Pencil size={15} aria-hidden="true" />
                      {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
                    </Link>
                    {row.postStatus === "published" && row.slug ? (
                      <a
                        href={`${site.url}/news/${row.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-outline is-compact"
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                        {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                      </a>
                    ) : null}

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

                    {(isAdmin && ["requested", "processing", "ready", "rejected"].includes(row.status)) ||
                    (!isAdmin && row.status === "requested") ? (
                      <button
                        type="button"
                        className="button button-outline is-compact"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => cancelTaskRequest({ id: row.id }),
                            tr({
                              en: "Request cancelled.",
                              kn: "ವಿನಂತಿ ರದ್ದುಗೊಂಡಿದೆ.",
                              hi: "अनुरोध रद्द।",
                            }),
                          )
                        }
                      >
                        <X size={15} aria-hidden="true" />
                        {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

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
                      en: "Request rejected.",
                      kn: "ವಿನಂತಿ ತಿರಸ್ಕರಿಸಲಾಯಿತು.",
                      hi: "अनुरोध अस्वीकृत।",
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
