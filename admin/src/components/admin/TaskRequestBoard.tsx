"use client";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Pencil, Send, X } from "lucide-react";
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

const requestStatusNames: Record<string, Tri> = {
  requested: { en: "Requested", kn: "ವಿನಂತಿಸಲಾಗಿದೆ", hi: "अनुरोधित" },
  processing: { en: "Processing", kn: "ಸಂಸ್ಕರಣೆ", hi: "प्रोसेसिंग" },
  ready: { en: "Ready", kn: "ಸಿದ್ಧ", hi: "तैयार" },
  rejected: { en: "Rejected", kn: "ತಿರಸ್ಕೃತ", hi: "अस्वीकृत" },
  done: { en: "Done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण" },
  cancelled: { en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" },
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
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [filterStatus, setFilterStatus] = useState<string>("active");
  const [filterStaff, setFilterStaff] = useState("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState("");
  const [adminNote, setAdminNote] = useState("");

  const visible = useMemo(() => {
    return requests.filter((row) => {
      if (filterStaff !== "all" && row.requesterId !== filterStaff) return false;
      if (filterStatus === "active")
        return ["requested", "processing", "ready"].includes(row.status);
      if (filterStatus === "all") return true;
      return row.status === filterStatus;
    });
  }, [requests, filterStatus, filterStaff]);

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

  return (
    <div className="task-request-board">
      {message.error ? <p role="alert">{message.error}</p> : null}
      {message.ok ? <p role="status">{message.ok}</p> : null}

      <section className="panel task-request-panel">
        <div className="task-request-toolbar">
          <h2>{tr({ en: "Requests", kn: "ವಿನಂತಿಗಳು", hi: "अनुरोध" })}</h2>
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
            <label className="field" style={{ margin: 0 }}>
              <span className="sr-only">
                {tr({ en: "Status filter", kn: "ಸ್ಥಿತಿ ಫಿಲ್ಟರ್", hi: "स्थिति फ़िल्टर" })}
              </span>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="active">
                  {tr({ en: "Active", kn: "ಸಕ್ರಿಯ", hi: "सक्रिय" })}
                </option>
                <option value="requested">{tr(requestStatusNames.requested)}</option>
                <option value="processing">{tr(requestStatusNames.processing)}</option>
                <option value="ready">{tr(requestStatusNames.ready)}</option>
                <option value="rejected">{tr(requestStatusNames.rejected)}</option>
                <option value="done">{tr(requestStatusNames.done)}</option>
                <option value="cancelled">{tr(requestStatusNames.cancelled)}</option>
                <option value="all">{tr({ en: "All statuses", kn: "ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು", hi: "सभी स्थितियाँ" })}</option>
              </select>
            </label>
          </div>
        </div>

        <p className="task-request-lead">
          {isAdmin
            ? tr({
                en: "Review staff requests, paste a Google Drive link to approve, then publish when the article is marked ready.",
                kn: "ಸಿಬ್ಬಂದಿ ವಿನಂತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ, ಅನುಮೋದಿಸಲು Google Drive ಲಿಂಕ್ ಅಂಟಿಸಿ, ಲೇಖನ ಸಿದ್ಧವಾದಾಗ ಪ್ರಕಟಿಸಿ.",
                hi: "स्टाफ़ अनुरोधों की समीक्षा करें, स्वीकृति के लिए Google Drive लिंक चिपकाएँ, लेख तैयार होने पर प्रकाशित करें।",
              })
            : tr({
                en: "Track your verification requests. When processing, open the Drive link, finish the article, then send it to admin.",
                kn: "ನಿಮ್ಮ ಪರಿಶೀಲನಾ ವಿನಂತಿಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ. ಸಂಸ್ಕರಣೆಯಲ್ಲಿ Drive ತೆರೆಯಿರಿ, ಲೇಖನ ಮುಗಿಸಿ, ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಿ.",
                hi: "अपने सत्यापन अनुरोध ट्रैक करें। प्रोसेसिंग में Drive खोलें, लेख पूरा करें, फिर एडमिन को भेजें।",
              })}
        </p>

        {!visible.length ? (
          <p>
            {tr({
              en: "No requests in this view yet. Open Tasks and use Request on an assigned article.",
              kn: "ಈ ನೋಟದಲ್ಲಿ ಇನ್ನೂ ವಿನಂತಿಗಳಿಲ್ಲ. ಕಾರ್ಯಗಳಲ್ಲಿ ನಿಯೋಜಿತ ಲೇಖನದ ಮೇಲೆ ವಿನಂತಿ ಬಳಸಿ.",
              hi: "इस दृश्य में अभी अनुरोध नहीं। Tasks में असाइन लेख पर Request दबाएँ।",
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
                    <Link href={"/admin/posts/" + row.postId} prefetch={false}>
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
                      href={"/admin/posts/" + row.postId}
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
                              en: "Sent to admin.",
                              kn: "ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಲಾಯಿತು.",
                              hi: "एडमिन को भेजा।",
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
                              en: "Request marked done.",
                              kn: "ವಿನಂತಿ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಲಾಯಿತು.",
                              hi: "अनुरोध पूर्ण चिह्नित।",
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
            <div className="staff-chat-modal-body" style={{ display: "grid", gap: 12 }}>
              {reviewing.staffNote ? (
                <p>
                  <strong>{tr({ en: "Staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ", hi: "स्टाफ़ नोट" })}:</strong>{" "}
                  {reviewing.staffNote}
                </p>
              ) : null}
              <label className="field">
                <span>{tr({ en: "Google Drive link", kn: "Google Drive ಲಿಂಕ್", hi: "Google Drive लिंक" })}</span>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  autoComplete="off"
                />
              </label>
              <label className="field">
                <span>{tr({ en: "Admin note", kn: "ಆಡ್ಮಿನ್ ಟಿಪ್ಪಣಿ", hi: "एडमिन नोट" })}</span>
                <textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                />
              </label>
            </div>
            <footer className="staff-chat-modal-foot" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      reviewTaskRequest({
                        id: reviewing.id,
                        decision: "approve",
                        driveUrl,
                        adminNote,
                      }),
                    tr({
                      en: "Approved — processing.",
                      kn: "ಅನುಮೋದಿಸಲಾಯಿತು — ಸಂಸ್ಕರಣೆ.",
                      hi: "स्वीकृत — प्रोसेसिंग।",
                    }),
                  )
                }
              >
                {tr({ en: "Approve", kn: "ಅನುಮೋದಿಸಿ", hi: "स्वीकृत करें" })}
              </button>
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
                        driveUrl: "",
                        adminNote,
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
            </footer>
          </form>
        </div>
      ) : null}
    </div>
  );
}
