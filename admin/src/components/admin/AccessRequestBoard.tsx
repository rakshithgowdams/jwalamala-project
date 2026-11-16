"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";
import {
  cancelAccessRequest,
  reviewAccessRequest,
  type AccessRequestRow,
} from "@/app/admin/access-requests/actions";

const statusNames: Record<string, Tri> = {
  requested: { en: "Requested", kn: "ವಿನಂತಿಸಲಾಗಿದೆ", hi: "अनुरोधित" },
  approved: { en: "Approved", kn: "ಅನುಮೋದಿತ", hi: "स्वीकृत" },
  rejected: { en: "Rejected", kn: "ತಿರಸ್ಕೃತ", hi: "अस्वीकृत" },
  cancelled: { en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" },
};

type SectionKey = "request" | "completed";

type Props = {
  isAdmin: boolean;
  requests: AccessRequestRow[];
  staff: { id: string; name: string }[];
};

export function AccessRequestBoard({ isAdmin, requests, staff }: Props) {
  const { tr } = useUiStrings();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [section, setSection] = useState<SectionKey>("request");
  const [filterStaff, setFilterStaff] = useState("all");
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const counts = useMemo(() => {
    const byStaff = (row: AccessRequestRow) =>
      filterStaff === "all" || row.requesterId === filterStaff;
    return {
      request: requests.filter((r) => byStaff(r) && r.status === "requested").length,
      completed: requests.filter((r) => byStaff(r) && r.status !== "requested").length,
    };
  }, [requests, filterStaff]);

  const visible = useMemo(() => {
    return requests.filter((row) => {
      if (filterStaff !== "all" && row.requesterId !== filterStaff) return false;
      return section === "request" ? row.status === "requested" : row.status !== "requested";
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
          <h2>{tr({ en: "Access requests", kn: "ಪ್ರವೇಶ ವಿನಂತಿಗಳು", hi: "पहुँच अनुरोध" })}</h2>
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

        <div className="task-request-sections" role="tablist">
          {(
            [
              { key: "request" as const, label: { en: "Request", kn: "ವಿನಂತಿ", hi: "अनुरोध" } },
              { key: "completed" as const, label: { en: "Completed", kn: "ಪೂರ್ಣ", hi: "पूर्ण" } },
            ] as const
          ).map((item) => (
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

        <p className="task-request-lead">
          {section === "request"
            ? tr({
                en: "Staff asking for desk features they cannot open yet. Approve to grant access immediately.",
                kn: "ಸಿಬ್ಬಂದಿ ಇನ್ನೂ ತೆರೆಯಲಾಗದ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಕೇಳುತ್ತಿದ್ದಾರೆ. ಅನುಮೋದಿಸಿ ತಕ್ಷಣ ಪ್ರವೇಶ ನೀಡಿ.",
                hi: "स्टाफ़ उन सुविधाओं का अनुरोध कर रहे हैं जो अभी नहीं खुलतीं। स्वीकृत कर तुरंत पहुँच दें।",
              })
            : tr({
                en: "Approved, rejected, or cancelled access requests.",
                kn: "ಅನುಮೋದಿತ, ತಿರಸ್ಕೃತ ಅಥವಾ ರದ್ದಾದ ಪ್ರವೇಶ ವಿನಂತಿಗಳು.",
                hi: "स्वीकृत, अस्वीकृत या रद्द पहुँच अनुरोध।",
              })}
        </p>

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
            {visible.map((row) => (
              <article key={row.id} className="post-card is-draft">
                <div className="post-card-body">
                  <h2>{tr(row.sectionLabel)}</h2>
                  <p className="task-card-meta">
                    {isAdmin ? (
                      <>
                        <strong>{row.requesterName}</strong>
                        {" · "}
                      </>
                    ) : null}
                    <span className={"status-pill is-" + (row.status === "approved" ? "published" : row.status === "requested" ? "draft" : "archived")}>
                      {statusNames[row.status] ? tr(statusNames[row.status]) : row.status}
                    </span>
                    {" · "}
                    {row.staffNote ||
                      tr({ en: "No staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ ಇಲ್ಲ", hi: "स्टाफ़ नोट नहीं" })}
                  </p>
                  {row.adminNote ? (
                    <p className="task-request-admin-note">
                      <strong>{tr({ en: "Admin", kn: "ಆಡ್ಮಿನ್", hi: "एडमिन" })}:</strong> {row.adminNote}
                    </p>
                  ) : null}
                  <div className="post-actions">
                    {isAdmin && row.status === "requested" ? (
                      <button
                        type="button"
                        className="button is-compact"
                        disabled={pending}
                        onClick={() => {
                          setReviewId(row.id);
                          setAdminNote(row.adminNote || "");
                        }}
                      >
                        <Check size={15} aria-hidden="true" />
                        {tr({ en: "Review", kn: "ಪರಿಶೀಲಿಸಿ", hi: "समीक्षा" })}
                      </button>
                    ) : null}
                    {row.status === "requested" ? (
                      <button
                        type="button"
                        className="button button-outline is-compact"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => cancelAccessRequest({ id: row.id }),
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
            aria-label={tr({ en: "Review access request", kn: "ಪ್ರವೇಶ ವಿನಂತಿ ಪರಿಶೀಲನೆ", hi: "पहुँच अनुरोध समीक्षा" })}
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => e.preventDefault()}
          >
            <header className="staff-chat-modal-head">
              <div>
                <h2>{tr({ en: "Review access request", kn: "ಪ್ರವೇಶ ವಿನಂತಿ ಪರಿಶೀಲನೆ", hi: "पहुँच अनुरोध समीक्षा" })}</h2>
                <p className="staff-chat-modal-lead">
                  {reviewing.requesterName} · {tr(reviewing.sectionLabel)}
                </p>
              </div>
              <button type="button" className="button button-outline is-compact" onClick={() => setReviewId(null)}>
                {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
              </button>
            </header>
            {reviewing.staffNote ? (
              <p className="task-request-admin-note">
                <strong>{tr({ en: "Staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ", hi: "स्टाफ़ नोट" })}:</strong>{" "}
                {reviewing.staffNote}
              </p>
            ) : null}
            <label className="field">
              <span>{tr({ en: "Admin note", kn: "ಆಡ್ಮಿನ್ ಟಿಪ್ಪಣಿ", hi: "एडमिन नोट" })}</span>
              <textarea
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={tr({
                  en: "Required when rejecting",
                  kn: "ತಿರಸ್ಕರಿಸುವಾಗ ಅಗತ್ಯ",
                  hi: "अस्वीकार करते समय आवश्यक",
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
                      reviewAccessRequest({
                        id: reviewing.id,
                        decision: "reject",
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
              <button
                type="button"
                className="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () =>
                      reviewAccessRequest({
                        id: reviewing.id,
                        decision: "approve",
                        adminNote,
                      }),
                    tr({
                      en: "Access granted.",
                      kn: "ಪ್ರವೇಶ ನೀಡಲಾಯಿತು.",
                      hi: "पहुँच दी गई।",
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
