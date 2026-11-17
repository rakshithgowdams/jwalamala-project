"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CircleAlert, ExternalLink, Eye, Layers, Pencil, RefreshCw, SendHorizontal, Trash2 } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ArticleCardSearch } from "@/components/admin/ArticleCardSearch";
import { PostThumb } from "@/components/admin/PostThumb";
import { site } from "@/config/site";
import type { Tri } from "@/lib/i18n/strings";
import { youtubeThumbnail } from "@/lib/utils/images";
import {
  assignBulkRange,
  assignSingleArticle,
  cancelOpenBatch,
  setTaskStatus,
  updateOpenBatch,
} from "@/app/admin/tasks/actions";
import { createTaskRequest } from "@/app/admin/task-requests/actions";
import { useDeskPath } from "@/components/admin/DeskPathProvider";

function parseBatchRange(label: string): { fromPos: string; toPos: string } | null {
  const match = /^(\d+)-(\d+)$/.exec(label.trim());
  if (!match) return null;
  return { fromPos: match[1], toPos: match[2] };
}

export type TaskRow = {
  id: string;
  postId: string;
  title: string;
  thumbnail: string | null;
  videoUrl: string | null;
  postStatus: string;
  postType: string;
  updatedAt: string | null;
  slug: string | null;
  status: string;
  batchLabel: string;
  notes: string;
  assigneeId: string;
  assigneeName: string;
  createdAt: string;
};

const statusNames: Record<string, Tri> = {
  draft: { en: "Draft", kn: "ಕರಡು", hi: "ड्राफ़्ट" },
  scheduled: { en: "Scheduled", kn: "ನಿಗದಿತ", hi: "निर्धारित" },
  published: { en: "Published", kn: "ಪ್ರಕಟಿತ", hi: "प्रकाशित" },
  archived: { en: "Archived", kn: "ಸಂಗ್ರಹಿತ", hi: "संग्रहीत" },
};
const typeNames: Record<string, Tri> = {
  article: { en: "Article", kn: "ಲೇಖನ", hi: "लेख" },
  video: { en: "Video", kn: "ವಿಡಿಯೋ", hi: "वीडियो" },
  short: { en: "Short video", kn: "ಕಿರು ವಿಡಿಯೋ", hi: "छोटा वीडियो" },
};
const taskStatusNames: Record<string, Tri> = {
  open: { en: "Open", kn: "ತೆರೆದ", hi: "खुला" },
  done: { en: "Done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण" },
  cancelled: { en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" },
};
const requestStatusNames: Record<string, Tri> = {
  requested: { en: "Requested", kn: "ವಿನಂತಿಸಲಾಗಿದೆ", hi: "अनुरोधित" },
  processing: { en: "Processing", kn: "ಸಂಸ್ಕರಣೆ", hi: "प्रोसेसिंग" },
  ready: { en: "Ready", kn: "ಸಿದ್ಧ", hi: "तैयार" },
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

export type StaffOption = { id: string; name: string };

export type ActiveRequestInfo = { id: string; status: string };

export type BatchSummary = {
  key: string;
  batchLabel: string;
  assigneeId: string;
  assigneeName: string;
  count: number;
  notes: string;
  createdAt: string;
};

type Props = {
  isAdmin: boolean;
  totalArticles: number;
  staff: StaffOption[];
  tasks: TaskRow[];
  batches?: BatchSummary[];
  activeRequests?: Record<string, ActiveRequestInfo>;
};

function taskCardTone(task: TaskRow) {
  if (task.status === "cancelled") return "archived";
  if (task.status === "done") return "published";
  return task.postStatus || "draft";
}

function taskStatusPillClass(status: string) {
  if (status === "open") return "scheduled";
  if (status === "done") return "published";
  return "archived";
}

export function TaskBoard({
  isAdmin,
  totalArticles,
  staff,
  tasks,
  batches = [],
  activeRequests = {},
}: Props) {
  const { tr } = useUiStrings();
  const router = useRouter();
  const basePath = useDeskPath();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});
  const [assigneeId, setAssigneeId] = useState(staff[0]?.id || "");
  const [fromPos, setFromPos] = useState("1");
  const [toPos, setToPos] = useState(String(Math.min(1000, Math.max(1, totalArticles))));
  const [singlePostId, setSinglePostId] = useState("");
  const [singlePostTitle, setSinglePostTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"open" | "done" | "cancelled" | "all">("open");
  const [cancelTask, setCancelTask] = useState<TaskRow | null>(null);
  const [cancelBatch, setCancelBatch] = useState<BatchSummary | null>(null);
  const [editBatch, setEditBatch] = useState<BatchSummary | null>(null);
  const [editFromPos, setEditFromPos] = useState("1");
  const [editToPos, setEditToPos] = useState("1");
  const [editNotes, setEditNotes] = useState("");
  const [detailTask, setDetailTask] = useState<TaskRow | null>(null);
  const [detailBatch, setDetailBatch] = useState<BatchSummary | null>(null);
  const [requestTask, setRequestTask] = useState<TaskRow | null>(null);
  const [requestNote, setRequestNote] = useState("");

  useEffect(() => {
    if (!cancelTask && !cancelBatch && !editBatch && !detailTask && !detailBatch) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape" || pending) return;
      setCancelTask(null);
      setCancelBatch(null);
      setEditBatch(null);
      setDetailTask(null);
      setDetailBatch(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelTask, cancelBatch, editBatch, detailTask, detailBatch, pending]);

  function openEditBatch(batch: BatchSummary) {
    const range = parseBatchRange(batch.batchLabel);
    setEditBatch(batch);
    setEditFromPos(range?.fromPos || "1");
    setEditToPos(range?.toPos || String(batch.count || 1));
    setEditNotes(batch.notes || "");
  }

  const visibleBatches = useMemo(() => {
    if (!isAdmin || filterStatus === "done" || filterStatus === "cancelled") return [];
    return batches.filter((batch) => {
      if (filterAssignee !== "all" && batch.assigneeId !== filterAssignee) return false;
      return true;
    });
  }, [batches, filterAssignee, filterStatus, isAdmin]);

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (isAdmin && filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false;
      // Bulk batches already have a summary card — hide open batch members from the list noise.
      if (
        isAdmin &&
        filterStatus === "open" &&
        t.status === "open" &&
        t.batchLabel &&
        visibleBatches.some((b) => b.assigneeId === t.assigneeId && b.batchLabel === t.batchLabel)
      ) {
        return false;
      }
      return true;
    });
  }, [tasks, filterStatus, filterAssignee, isAdmin, visibleBatches]);

  function run(
    action: () => Promise<{
      ok?: true;
      error?: string;
      assigned?: number;
      added?: number;
      removed?: number;
    }>,
    done: string,
    opts?: { showCancelled?: boolean },
  ) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        let extra = "";
        if (opts?.showCancelled && typeof result.assigned === "number") {
          extra = tr({
            en: ` ${result.assigned} deleted.`,
            kn: ` ${result.assigned} ಅಳಿಸಲಾಯಿತು.`,
            hi: ` ${result.assigned} हटाए गए।`,
          });
        } else if (typeof result.added === "number" || typeof result.removed === "number") {
          const added = result.added || 0;
          const removed = result.removed || 0;
          extra = tr({
            en: ` Now ${result.assigned ?? 0} open (${added} added, ${removed} removed).`,
            kn: ` ಈಗ ${result.assigned ?? 0} ತೆರೆದ (${added} ಸೇರಿಸಲಾಯಿತು, ${removed} ತೆಗೆದುಹಾಕಲಾಯಿತು).`,
            hi: ` अब ${result.assigned ?? 0} खुले (${added} जोड़े, ${removed} हटाए)।`,
          });
        } else if (typeof result.assigned === "number") {
          extra = tr({
            en: ` Assigned ${result.assigned}.`,
            kn: ` ${result.assigned} ನಿಯೋಜಿಸಲಾಯಿತು.`,
            hi: ` ${result.assigned} असाइन हुए।`,
          });
        }
        setMessage({ ok: done + extra });
        if (opts?.showCancelled) setFilterStatus("cancelled");
        router.refresh();
      }
    });
  }

  const openCount = tasks.filter((t) => t.status === "open").length;
  const updatedOn = useMemo(
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

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <p>
        {isAdmin
          ? tr({
              en: `${totalArticles.toLocaleString("en-IN")} articles in the library. Only admins can create, update, or delete staff tasks. Example: assign 1–2000 to one person, then Update to 1–2500 or 1–200, or Delete the whole batch.`,
              kn: `ಲೈಬ್ರರಿಯಲ್ಲಿ ${totalArticles.toLocaleString("en-IN")} ಲೇಖನಗಳಿವೆ. ಸಿಬ್ಬಂದಿ ಕಾರ್ಯಗಳನ್ನು ರಚಿಸಲು, ನವೀಕರಿಸಲು ಅಥವಾ ಅಳಿಸಲು ನಿರ್ವಾಹಕರು ಮಾತ್ರ. ಉದಾ.: 1–2000 ನಿಯೋಜಿಸಿ, ನಂತರ Update ಮೂಲಕ 1–2500 ಅಥವಾ 1–200 ಮಾಡಿ, ಅಥವಾ Delete ಮಾಡಿ.`,
              hi: `लाइब्रेरी में ${totalArticles.toLocaleString("en-IN")} लेख हैं। स्टाफ़ कार्य बनाना, अपडेट या हटाना केवल एडमिन कर सकते हैं। उदाहरण: 1–2000 असाइन करें, फिर Update से 1–2500 या 1–200 करें, या Delete करें।`,
            })
          : tr({
              en: `You have ${openCount} open article task${openCount === 1 ? "" : "s"}. Open an article to edit it, then mark the task done. Only an admin can change or delete your assignment.`,
              kn: `ನಿಮಗೆ ${openCount} ತೆರೆದ ಲೇಖನ ಕಾರ್ಯ${openCount === 1 ? "" : "ಗಳು"} ಇವೆ. ಸಂಪಾದಿಸಲು ಲೇಖನ ತೆರೆಯಿರಿ, ನಂತರ ಕಾರ್ಯ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ. ನಿಯೋಜನೆ ಬದಲಾಯಿಸಲು ಅಥವಾ ಅಳಿಸಲು ನಿರ್ವಾಹಕರು ಮಾತ್ರ.`,
              hi: `आपके ${openCount} खुले लेख कार्य हैं। संपादन के लिए लेख खोलें, फिर कार्य पूर्ण चिह्नित करें। असाइनमेंट बदलना या हटाना केवल एडमिन कर सकते हैं।`,
            })}
      </p>

      {message.error ? <p role="alert">{message.error}</p> : null}
      {message.ok ? <p role="status">{message.ok}</p> : null}

      {isAdmin ? (
        <div style={{ display: "grid", gap: "1.25rem" }}>
          <section style={{ display: "grid", gap: "0.75rem" }}>
            <h2>
              {tr({
                en: "Bulk assign by number range",
                kn: "ಸಂಖ್ಯಾ ವ್ಯಾಪ್ತಿಯಿಂದ ಬೃಹತ್ ನಿಯೋಜನೆ",
                hi: "संख्या रेंज से बल्क असाइन",
              })}
            </h2>
            <p>
              {tr({
                en: "Articles are numbered from oldest to newest (1 = oldest). Example for 4,000 articles: give 1–1000, 1001–2000, 2001–3000, 3001–4000 to four people.",
                kn: "ಲೇಖನಗಳನ್ನು ಹಳೆಯದರಿಂದ ಹೊಸದರವರೆಗೆ ಸಂಖ್ಯೆ ಮಾಡಲಾಗುತ್ತದೆ (1 = ಹಳೆಯದು). 4,000 ಲೇಖನಗಳ ಉದಾಹರಣೆ: 1–1000, 1001–2000, 2001–3000, 3001–4000 ನಾಲ್ಕು ಜನರಿಗೆ.",
                hi: "लेख पुराने से नए क्रम में गिने जाते हैं (1 = सबसे पुराना)। 4,000 लेख का उदाहरण: 1–1000, 1001–2000, 2001–3000, 3001–4000 चार लोगों को।",
              })}
            </p>
            <div className="field-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
              <label className="field">
                <span>{tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" })}</span>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!staff.length}>
                  {!staff.length ? (
                    <option value="">{tr({ en: "Create a staff account first", kn: "ಮೊದಲು ಸಿಬ್ಬಂದಿ ಖಾತೆ ತೆರೆಯಿರಿ", hi: "पहले स्टाफ़ खाता बनाएँ" })}</option>
                  ) : (
                    staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="field">
                <span>{tr({ en: "From #", kn: "ಪ್ರಾರಂಭ #", hi: "से #" })}</span>
                <input inputMode="numeric" value={fromPos} onChange={(e) => setFromPos(e.target.value)} />
              </label>
              <label className="field">
                <span>{tr({ en: "To #", kn: "ಕೊನೆ #", hi: "तक #" })}</span>
                <input inputMode="numeric" value={toPos} onChange={(e) => setToPos(e.target.value)} />
              </label>
              <label className="field" style={{ minWidth: "12rem", flex: 1 }}>
                <span>{tr({ en: "Note (optional)", kn: "ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)", hi: "नोट (वैकल्पिक)" })}</span>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} />
              </label>
              <button
                type="button"
                className="button button-ember"
                disabled={pending || !staff.length}
                onClick={() =>
                  run(
                    () =>
                      assignBulkRange({
                        assigneeId,
                        fromPos,
                        toPos,
                        notes,
                      }),
                    tr({ en: "Bulk assignment saved.", kn: "ಬೃಹತ್ ನಿಯೋಜನೆ ಉಳಿಸಲಾಯಿತು.", hi: "बल्क असाइनमेंट सहेजा गया।" }),
                  )
                }
              >
                {tr({ en: "Assign range", kn: "ವ್ಯಾಪ್ತಿ ನಿಯೋಜಿಸಿ", hi: "रेंज असाइन करें" })}
              </button>
            </div>
          </section>

          <section style={{ display: "grid", gap: "0.75rem" }}>
            <h2>
              {tr({
                en: "Assign one article",
                kn: "ಒಂದು ಲೇಖನ ನಿಯೋಜಿಸಿ",
                hi: "एक लेख असाइन करें",
              })}
            </h2>
            <p>
              {tr({
                en: "Use the story picker card search below to find any article by title, then assign it to staff.",
                kn: "ಕೆಳಗಿನ ಸ್ಟೋರಿ ಪಿಕರ್ ಕಾರ್ಡ್ ಹುಡುಕಾಟದಿಂದ ಯಾವುದೇ ಲೇಖನವನ್ನು ಶೀರ್ಷಿಕೆಯಿಂದ ಹುಡುಕಿ, ನಂತರ ಸಿಬ್ಬಂದಿಗೆ ನಿಯೋಜಿಸಿ.",
                hi: "नीचे स्टोरी पिकर कार्ड खोज से किसी भी लेख को शीर्षक से खोजें, फिर स्टाफ़ को असाइन करें।",
              })}
            </p>
            <ArticleCardSearch
              value={singlePostId}
              selectedTitle={singlePostTitle}
              onChange={(hit) => {
                setSinglePostId(hit?.id || "");
                setSinglePostTitle(hit?.title || "");
              }}
            />
            <div className="field-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "end" }}>
              <label className="field">
                <span>{tr({ en: "Staff", kn: "ಸಿಬ್ಬಂದಿ", hi: "स्टाफ़" })}</span>
                <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} disabled={!staff.length}>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-ember"
                disabled={pending || !staff.length || !singlePostId}
                onClick={() =>
                  run(
                    () =>
                      assignSingleArticle({
                        assigneeId,
                        postId: singlePostId,
                        notes,
                      }),
                    tr({ en: "Article assigned.", kn: "ಲೇಖನ ನಿಯೋಜಿಸಲಾಯಿತು.", hi: "लेख असाइन हुआ।" }),
                  )
                }
              >
                {tr({ en: "Assign article", kn: "ಲೇಖನ ನಿಯೋಜಿಸಿ", hi: "लेख असाइन करें" })}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      <section style={{ display: "grid", gap: "0.75rem" }}>
        <div className="section-title" style={{ margin: 0 }}>
          <h2 style={{ margin: 0 }}>
            {tr({ en: "Assignments", kn: "ನಿಯೋಜನೆಗಳು", hi: "असाइनमेंट" })}
          </h2>
          <div className="page-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {isAdmin ? (
              <label className="field" style={{ margin: 0 }}>
                <span className="sr-only">{tr({ en: "Staff filter", kn: "ಸಿಬ್ಬಂದಿ ಫಿಲ್ಟರ್", hi: "स्टाफ़ फ़िल्टर" })}</span>
                <select value={filterAssignee} onChange={(e) => setFilterAssignee(e.target.value)}>
                  <option value="all">{tr({ en: "All staff", kn: "ಎಲ್ಲಾ ಸಿಬ್ಬಂದಿ", hi: "सभी स्टाफ़" })}</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
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
            <label className="field" style={{ margin: 0 }}>
              <span className="sr-only">{tr({ en: "Status filter", kn: "ಸ್ಥಿತಿ ಫಿಲ್ಟರ್", hi: "स्थिति फ़िल्टर" })}</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
              >
                <option value="open">{tr({ en: "Open", kn: "ತೆರೆದ", hi: "खुला" })}</option>
                <option value="done">{tr({ en: "Done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण" })}</option>
                <option value="cancelled">{tr({ en: "Cancelled", kn: "ರದ್ದು", hi: "रद्द" })}</option>
                <option value="all">{tr({ en: "All statuses", kn: "ಎಲ್ಲಾ ಸ್ಥಿತಿಗಳು", hi: "सभी स्थितियाँ" })}</option>
              </select>
            </label>
          </div>
        </div>

        {!visibleBatches.length && !visible.length ? (
          <p>
            {tr({
              en: "No assignments in this view yet. Use the status filter to see Cancelled or Done.",
              kn: "ಈ ನೋಟದಲ್ಲಿ ಇನ್ನೂ ನಿಯೋಜನೆಗಳಿಲ್ಲ. ರದ್ದು ಅಥವಾ ಮುಗಿದಿದೆ ನೋಡಲು ಸ್ಥಿತಿ ಫಿಲ್ಟರ್ ಬಳಸಿ.",
              hi: "इस दृश्य में अभी कोई असाइनमेंट नहीं। रद्द या पूर्ण देखने के लिए स्थिति फ़िल्टर उपयोग करें।",
            })}
          </p>
        ) : (
          <div className="post-card-list">
            {visibleBatches.map((batch, index) => (
              <article
                key={batch.key}
                className="post-card is-scheduled task-batch-card"
                style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
              >
                <div className="post-card-thumb task-batch-thumb" aria-hidden="true">
                  <Layers size={36} strokeWidth={1.75} />
                  <div className="post-card-badges">
                    <span className="status-pill is-scheduled">
                      {tr({ en: "Open batch", kn: "ತೆರೆದ ಬ್ಯಾಚ್", hi: "खुला बैच" })}
                    </span>
                    <span className="post-card-type">#{batch.batchLabel}</span>
                  </div>
                </div>
                <div className="post-card-body">
                  <h2>
                    {tr({
                      en: `${batch.count.toLocaleString("en-IN")} articles · #${batch.batchLabel}`,
                      kn: `${batch.count.toLocaleString("en-IN")} ಲೇಖನಗಳು · #${batch.batchLabel}`,
                      hi: `${batch.count.toLocaleString("en-IN")} लेख · #${batch.batchLabel}`,
                    })}
                  </h2>
                  <p className="task-card-meta">
                    <strong>{batch.assigneeName}</strong>
                    {batch.notes ? ` · ${batch.notes}` : null}
                  </p>
                  <div className="post-actions">
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      onClick={() => setDetailBatch(batch)}
                    >
                      <Eye size={15} aria-hidden="true" />
                      {tr({ en: "Details", kn: "ವಿವರ", hi: "विवरण" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() => openEditBatch(batch)}
                    >
                      <Pencil size={15} aria-hidden="true" />
                      {tr({ en: "Update", kn: "ನವೀಕರಿಸಿ", hi: "अपडेट" })}
                    </button>
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      disabled={pending}
                      onClick={() => setCancelBatch(batch)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                      {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {visible.map((task, index) => (
              <article
                key={task.id}
                className={"post-card is-" + taskCardTone(task)}
                style={{ animationDelay: Math.min(index + visibleBatches.length, 11) * 45 + "ms" }}
              >
                <div className="post-card-thumb">
                  <PostThumb
                    src={cardThumbnail(task.thumbnail, task.videoUrl)}
                    eager={index < 6}
                  />
                  <div className="post-card-badges">
                    <span className={"status-pill is-" + taskStatusPillClass(task.status)}>
                      {taskStatusNames[task.status] ? tr(taskStatusNames[task.status]) : task.status}
                    </span>
                    {task.postStatus ? (
                      <span className={"status-pill is-" + task.postStatus}>
                        {statusNames[task.postStatus]
                          ? tr(statusNames[task.postStatus])
                          : task.postStatus}
                      </span>
                    ) : null}
                    {task.postType ? (
                      <span className="post-card-type">
                        {typeNames[task.postType] ? tr(typeNames[task.postType]) : task.postType}
                      </span>
                    ) : null}
                    {activeRequests[task.id] ? (
                      <span className="status-pill is-draft">
                        {requestStatusNames[activeRequests[task.id].status]
                          ? tr(requestStatusNames[activeRequests[task.id].status])
                          : activeRequests[task.id].status}
                      </span>
                    ) : null}
                  </div>
                  {task.updatedAt ? (
                    <time className="post-card-updated" dateTime={task.updatedAt}>
                      {tr({ en: "Updated", kn: "ಬದಲಾವಣೆ", hi: "बदलाव" })}{" "}
                      {updatedOn.format(new Date(task.updatedAt))}
                    </time>
                  ) : null}
                </div>
                <div className="post-card-body">
                  <h2>
                    <Link href={`${basePath}/posts/${task.postId}`} prefetch={false}>
                      {task.title || task.postId}
                    </Link>
                  </h2>
                  <p className="task-card-meta">
                    {isAdmin ? (
                      <>
                        <strong>{task.assigneeName}</strong>
                        {" · "}
                      </>
                    ) : null}
                    {task.batchLabel ? `#${task.batchLabel}` : null}
                    {task.batchLabel && task.notes ? " · " : null}
                    {task.notes || null}
                  </p>
                  <div className="post-actions">
                    <button
                      type="button"
                      className="button button-outline is-compact"
                      onClick={() => setDetailTask(task)}
                    >
                      <Eye size={15} aria-hidden="true" />
                      {tr({ en: "Details", kn: "ವಿವರ", hi: "विवरण" })}
                    </button>
                    <Link
                      href={`${basePath}/posts/${task.postId}`}
                      prefetch={false}
                      className="button button-outline is-compact"
                    >
                      <Pencil size={15} aria-hidden="true" />
                      {tr({ en: "Edit", kn: "ತಿದ್ದಿ", hi: "संपादित करें" })}
                    </Link>
                    {task.postStatus === "published" && task.slug ? (
                      <a
                        href={`${site.url}/news/${task.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="button button-outline is-compact"
                      >
                        <ExternalLink size={15} aria-hidden="true" />
                        {tr({ en: "View", kn: "ನೋಡಿ", hi: "देखें" })}
                      </a>
                    ) : null}
                    {!isAdmin && task.status === "open" && !activeRequests[task.id] ? (
                      <button
                        type="button"
                        className="button button-outline is-compact"
                        disabled={pending}
                        onClick={() => {
                          setRequestTask(task);
                          setRequestNote("");
                        }}
                      >
                        <SendHorizontal size={15} aria-hidden="true" />
                        {tr({ en: "Request", kn: "ವಿನಂತಿ", hi: "अनुरोध" })}
                      </button>
                    ) : null}
                    {!isAdmin && task.status === "open" && activeRequests[task.id] ? (
                      <Link
                        href={`${basePath}/task-requests`}
                        prefetch={false}
                        className="button button-outline is-compact"
                      >
                        {tr({ en: "View request", kn: "ವಿನಂತಿ ನೋಡಿ", hi: "अनुरोध देखें" })}
                      </Link>
                    ) : null}
                    {task.status === "open" ? (
                      <button
                        type="button"
                        className="button is-compact"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setTaskStatus({ id: task.id, status: "done" }),
                            tr({
                              en: "Marked done.",
                              kn: "ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಲಾಯಿತು.",
                              hi: "पूर्ण चिह्नित।",
                            }),
                          )
                        }
                      >
                        {tr({ en: "Done", kn: "ಮುಗಿದಿದೆ", hi: "पूर्ण" })}
                      </button>
                    ) : null}
                    {isAdmin && task.status === "open" ? (
                      <button
                        type="button"
                        className="button button-outline is-compact"
                        disabled={pending}
                        onClick={() => setCancelTask(task)}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
                      </button>
                    ) : null}
                    {isAdmin && task.status !== "open" ? (
                      <button
                        type="button"
                        className="button button-outline is-compact"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () => setTaskStatus({ id: task.id, status: "open" }),
                            tr({
                              en: "Task reopened.",
                              kn: "ಕಾರ್ಯ ಮರುತೆರೆಯಲಾಯಿತು.",
                              hi: "कार्य फिर खोला।",
                            }),
                          )
                        }
                      >
                        {tr({ en: "Reopen", kn: "ಮರುತೆರೆಯಿರಿ", hi: "फिर खोलें" })}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {cancelTask && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => !pending && setCancelTask(null)}
            >
              <div
                className="delete-dialog confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-task-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="confirm-dialog-icon" aria-hidden="true">
                  <CircleAlert size={28} strokeWidth={2.25} />
                </div>
                <h2 id="cancel-task-title">
                  {tr({
                    en: "Delete this task?",
                    kn: "ಈ ಕಾರ್ಯವನ್ನು ಅಳಿಸುವುದೇ?",
                    hi: "यह कार्य हटाएँ?",
                  })}
                </h2>
                <p>
                  {tr({
                    en: "Only admins can delete assignments. The staff member will no longer edit this article from Tasks. It will show as Cancelled.",
                    kn: "ನಿಯೋಜನೆಗಳನ್ನು ನಿರ್ವಾಹಕರು ಮಾತ್ರ ಅಳಿಸಬಹುದು. ಸಿಬ್ಬಂದಿ ಈ ಲೇಖನವನ್ನು Tasks ನಿಂದ ಸಂಪಾದಿಸಲು ಸಾಧ್ಯವಾಗುವುದಿಲ್ಲ. ಇದು ರದ್ದು ಎಂದು ಕಾಣುತ್ತದೆ.",
                    hi: "असाइनमेंट केवल एडमिन हटा सकते हैं। स्टाफ़ Tasks से इस लेख को संपादित नहीं कर पाएगा। यह रद्द दिखेगा।",
                  })}
                </p>
                <div className="confirm-dialog-preview">
                  <span className="confirm-dialog-thumb">
                    <PostThumb src={cardThumbnail(cancelTask.thumbnail, cancelTask.videoUrl)} eager />
                  </span>
                  <div>
                    <strong>{cancelTask.title || cancelTask.postId}</strong>
                    <small>
                      {cancelTask.assigneeName}
                      {cancelTask.batchLabel ? ` · #${cancelTask.batchLabel}` : ""}
                    </small>
                  </div>
                </div>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setCancelTask(null)}
                  >
                    {tr({ en: "Keep task", kn: "ಕಾರ್ಯ ಇರಿಸಿ", hi: "कार्य रखें" })}
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={pending}
                    onClick={() => {
                      const id = cancelTask.id;
                      setCancelTask(null);
                      run(
                        () => setTaskStatus({ id, status: "cancelled" }),
                        tr({
                          en: "Task deleted — shown under Cancelled.",
                          kn: "ಕಾರ್ಯ ಅಳಿಸಲಾಯಿತು — ರದ್ದು ಫಿಲ್ಟರ್‌ನಲ್ಲಿ ಕಾಣುತ್ತದೆ.",
                          hi: "कार्य हटाया — रद्द फ़िल्टर में दिखेगा।",
                        }),
                        { showCancelled: true },
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

      {cancelBatch && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => !pending && setCancelBatch(null)}
            >
              <div
                className="delete-dialog confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cancel-batch-title"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="confirm-dialog-icon" aria-hidden="true">
                  <CircleAlert size={28} strokeWidth={2.25} />
                </div>
                <h2 id="cancel-batch-title">
                  {tr({
                    en: "Delete this whole batch?",
                    kn: "ಈ ಸಂಪೂರ್ಣ ಬ್ಯಾಚ್ ಅಳಿಸುವುದೇ?",
                    hi: "पूरा बैच हटाएँ?",
                  })}
                </h2>
                <p>
                  {tr({
                    en: `This deletes all ${cancelBatch.count.toLocaleString("en-IN")} open assignments in #${cancelBatch.batchLabel} for ${cancelBatch.assigneeName}. Only admins can do this. They will appear under Cancelled.`,
                    kn: `ಇದು ${cancelBatch.assigneeName} ಅವರ #${cancelBatch.batchLabel} ನಲ್ಲಿನ ${cancelBatch.count.toLocaleString("en-IN")} ತೆರೆದ ನಿಯೋಜನೆಗಳನ್ನು ಅಳಿಸುತ್ತದೆ. ನಿರ್ವಾಹಕರು ಮಾತ್ರ. ಅವು ರದ್ದು ಫಿಲ್ಟರ್‌ನಲ್ಲಿ ಕಾಣುತ್ತವೆ.`,
                    hi: `यह ${cancelBatch.assigneeName} के #${cancelBatch.batchLabel} में ${cancelBatch.count.toLocaleString("en-IN")} खुले असाइनमेंट हटाता है। केवल एडमिन। वे रद्द फ़िल्टर में दिखेंगे।`,
                  })}
                </p>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setCancelBatch(null)}
                  >
                    {tr({ en: "Keep batch", kn: "ಬ್ಯಾಚ್ ಇರಿಸಿ", hi: "बैच रखें" })}
                  </button>
                  <button
                    type="button"
                    className="button button-danger"
                    disabled={pending}
                    onClick={() => {
                      const payload = {
                        assigneeId: cancelBatch.assigneeId,
                        batchLabel: cancelBatch.batchLabel,
                      };
                      setCancelBatch(null);
                      run(
                        () => cancelOpenBatch(payload),
                        tr({
                          en: "Batch deleted — shown under Cancelled.",
                          kn: "ಬ್ಯಾಚ್ ಅಳಿಸಲಾಯಿತು — ರದ್ದು ಫಿಲ್ಟರ್‌ನಲ್ಲಿ ಕಾಣುತ್ತದೆ.",
                          hi: "बैच हटाया — रद्द फ़िल्टर में दिखेगा।",
                        }),
                        { showCancelled: true },
                      );
                    }}
                  >
                    {tr({
                      en: "Yes, delete batch",
                      kn: "ಹೌದು, ಬ್ಯಾಚ್ ಅಳಿಸಿ",
                      hi: "हाँ, बैच हटाएँ",
                    })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {editBatch && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => !pending && setEditBatch(null)}
            >
              <form
                className="delete-dialog confirm-dialog task-detail-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="edit-batch-title"
                onClick={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  const batch = editBatch;
                  const fromPos = editFromPos;
                  const toPos = editToPos;
                  const notesValue = editNotes;
                  setEditBatch(null);
                  run(
                    () =>
                      updateOpenBatch({
                        assigneeId: batch.assigneeId,
                        batchLabel: batch.batchLabel,
                        fromPos,
                        toPos,
                        notes: notesValue,
                      }),
                    tr({
                      en: "Batch updated.",
                      kn: "ಬ್ಯಾಚ್ ನವೀಕರಿಸಲಾಯಿತು.",
                      hi: "बैच अपडेट हुआ।",
                    }),
                  );
                }}
              >
                <h2 id="edit-batch-title">
                  {tr({
                    en: "Update batch range",
                    kn: "ಬ್ಯಾಚ್ ವ್ಯಾಪ್ತಿ ನವೀಕರಿಸಿ",
                    hi: "बैच रेंज अपडेट करें",
                  })}
                </h2>
                <p>
                  {tr({
                    en: `Change ${editBatch.assigneeName}'s #${editBatch.batchLabel} (${editBatch.count.toLocaleString("en-IN")} articles). Example: 1–2000 → 1–2500 adds articles; 1–200 removes the rest.`,
                    kn: `${editBatch.assigneeName} ಅವರ #${editBatch.batchLabel} (${editBatch.count.toLocaleString("en-IN")} ಲೇಖನಗಳು) ಬದಲಾಯಿಸಿ. ಉದಾ.: 1–2000 → 1–2500 ಸೇರಿಸುತ್ತದೆ; 1–200 ಉಳಿದವುಗಳನ್ನು ತೆಗೆಯುತ್ತದೆ.`,
                    hi: `${editBatch.assigneeName} का #${editBatch.batchLabel} (${editBatch.count.toLocaleString("en-IN")} लेख) बदलें। उदाहरण: 1–2000 → 1–2500 जोड़ता है; 1–200 बाकी हटाता है।`,
                  })}
                </p>
                <div className="field-row" style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", width: "100%" }}>
                  <label className="field" style={{ flex: "1 1 6rem" }}>
                    <span>{tr({ en: "From #", kn: "ಪ್ರಾರಂಭ #", hi: "से #" })}</span>
                    <input
                      inputMode="numeric"
                      value={editFromPos}
                      onChange={(e) => setEditFromPos(e.target.value)}
                      required
                    />
                  </label>
                  <label className="field" style={{ flex: "1 1 6rem" }}>
                    <span>{tr({ en: "To #", kn: "ಕೊನೆ #", hi: "तक #" })}</span>
                    <input
                      inputMode="numeric"
                      value={editToPos}
                      onChange={(e) => setEditToPos(e.target.value)}
                      required
                    />
                  </label>
                </div>
                <label className="field" style={{ display: "grid", gap: 6, textAlign: "left", width: "100%" }}>
                  <span>{tr({ en: "Note (optional)", kn: "ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)", hi: "नोट (वैकल्पिक)" })}</span>
                  <input value={editNotes} onChange={(e) => setEditNotes(e.target.value)} maxLength={500} />
                </label>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setEditBatch(null)}
                  >
                    {tr({ en: "Back", kn: "ಹಿಂದೆ", hi: "वापस" })}
                  </button>
                  <button type="submit" className="button" disabled={pending}>
                    {tr({ en: "Save update", kn: "ನವೀಕರಣ ಉಳಿಸಿ", hi: "अपडेट सहेजें" })}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}

      {detailTask && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => setDetailTask(null)}
            >
              <div
                className="delete-dialog confirm-dialog task-detail-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-detail-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="task-detail-title">
                  {tr({ en: "Task details", kn: "ಕಾರ್ಯ ವಿವರ", hi: "कार्य विवरण" })}
                </h2>
                <div className="confirm-dialog-preview">
                  <span className="confirm-dialog-thumb">
                    <PostThumb src={cardThumbnail(detailTask.thumbnail, detailTask.videoUrl)} eager />
                  </span>
                  <div>
                    <strong>{detailTask.title || detailTask.postId}</strong>
                    <small>
                      <span className={"status-pill is-" + taskStatusPillClass(detailTask.status)}>
                        {taskStatusNames[detailTask.status]
                          ? tr(taskStatusNames[detailTask.status])
                          : detailTask.status}
                      </span>
                    </small>
                  </div>
                </div>
                <dl className="task-detail-grid">
                  <div>
                    <dt>{tr({ en: "Assignee", kn: "ನಿಯೋಜಿತ", hi: "असाइनी" })}</dt>
                    <dd>{detailTask.assigneeName}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Batch", kn: "ಬ್ಯಾಚ್", hi: "बैच" })}</dt>
                    <dd>{detailTask.batchLabel ? `#${detailTask.batchLabel}` : "—"}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Article status", kn: "ಲೇಖನ ಸ್ಥಿತಿ", hi: "लेख स्थिति" })}</dt>
                    <dd>
                      {detailTask.postStatus
                        ? statusNames[detailTask.postStatus]
                          ? tr(statusNames[detailTask.postStatus])
                          : detailTask.postStatus
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Type", kn: "ಪ್ರಕಾರ", hi: "प्रकार" })}</dt>
                    <dd>
                      {detailTask.postType
                        ? typeNames[detailTask.postType]
                          ? tr(typeNames[detailTask.postType])
                          : detailTask.postType
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Notes", kn: "ಟಿಪ್ಪಣಿ", hi: "नोट" })}</dt>
                    <dd>{detailTask.notes || "—"}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Assigned", kn: "ನಿಯೋಜನೆ", hi: "असाइन" })}</dt>
                    <dd>
                      {detailTask.createdAt
                        ? updatedOn.format(new Date(detailTask.createdAt))
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Request", kn: "ವಿನಂತಿ", hi: "अनुरोध" })}</dt>
                    <dd>
                      {activeRequests[detailTask.id]
                        ? requestStatusNames[activeRequests[detailTask.id].status]
                          ? tr(requestStatusNames[activeRequests[detailTask.id].status])
                          : activeRequests[detailTask.id].status
                        : tr({ en: "None active", kn: "ಸಕ್ರಿಯವಿಲ್ಲ", hi: "कोई सक्रिय नहीं" })}
                    </dd>
                  </div>
                </dl>
                <div className="delete-dialog-actions">
                  <Link
                    href={`${basePath}/posts/${detailTask.postId}`}
                    prefetch={false}
                    className="button button-outline"
                    onClick={() => setDetailTask(null)}
                  >
                    {tr({ en: "Open article", kn: "ಲೇಖನ ತೆರೆಯಿರಿ", hi: "लेख खोलें" })}
                  </Link>
                  <button type="button" className="button" onClick={() => setDetailTask(null)}>
                    {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {detailBatch && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => setDetailBatch(null)}
            >
              <div
                className="delete-dialog confirm-dialog task-detail-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="batch-detail-title"
                onClick={(event) => event.stopPropagation()}
              >
                <h2 id="batch-detail-title">
                  {tr({ en: "Batch details", kn: "ಬ್ಯಾಚ್ ವಿವರ", hi: "बैच विवरण" })}
                </h2>
                <dl className="task-detail-grid">
                  <div>
                    <dt>{tr({ en: "Batch", kn: "ಬ್ಯಾಚ್", hi: "बैच" })}</dt>
                    <dd>#{detailBatch.batchLabel}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Assignee", kn: "ನಿಯೋಜಿತ", hi: "असाइनी" })}</dt>
                    <dd>{detailBatch.assigneeName}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Open articles", kn: "ತೆರೆದ ಲೇಖನಗಳು", hi: "खुले लेख" })}</dt>
                    <dd>{detailBatch.count.toLocaleString("en-IN")}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Notes", kn: "ಟಿಪ್ಪಣಿ", hi: "नोट" })}</dt>
                    <dd>{detailBatch.notes || "—"}</dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Last activity", kn: "ಕೊನೆಯ ಚಟುವಟಿಕೆ", hi: "अंतिम गतिविधि" })}</dt>
                    <dd>
                      {detailBatch.createdAt
                        ? updatedOn.format(new Date(detailBatch.createdAt))
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>{tr({ en: "Status", kn: "ಸ್ಥಿತಿ", hi: "स्थिति" })}</dt>
                    <dd>
                      <span className="status-pill is-scheduled">
                        {tr({ en: "Open", kn: "ತೆರೆದ", hi: "खुला" })}
                      </span>
                    </dd>
                  </div>
                </dl>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => {
                      const batch = detailBatch;
                      setDetailBatch(null);
                      openEditBatch(batch);
                    }}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    {tr({ en: "Update", kn: "ನವೀಕರಿಸಿ", hi: "अपडेट" })}
                  </button>
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => {
                      const batch = detailBatch;
                      setDetailBatch(null);
                      setCancelBatch(batch);
                    }}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    {tr({ en: "Delete", kn: "ಅಳಿಸಿ", hi: "हटाएँ" })}
                  </button>
                  <button type="button" className="button" onClick={() => setDetailBatch(null)}>
                    {tr({ en: "Close", kn: "ಮುಚ್ಚಿ", hi: "बंद" })}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      {requestTask && typeof document !== "undefined"
        ? createPortal(
            <div
              className="delete-dialog-backdrop confirm-dialog-backdrop"
              onClick={() => !pending && setRequestTask(null)}
            >
              <form
                className="delete-dialog confirm-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="request-task-title"
                onClick={(event) => event.stopPropagation()}
                onSubmit={(event) => {
                  event.preventDefault();
                  const taskId = requestTask.id;
                  const staffNote = requestNote.trim();
                  setRequestTask(null);
                  setRequestNote("");
                  run(
                    () => createTaskRequest({ taskId, staffNote }),
                    tr({
                      en: "Request sent to admin.",
                      kn: "ವಿನಂತಿ ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಲಾಯಿತು.",
                      hi: "अनुरोध एडमिन को भेजा।",
                    }),
                  );
                }}
              >
                <h2 id="request-task-title">
                  {tr({
                    en: "Request verification",
                    kn: "ಪರಿಶೀಲನೆ ವಿನಂತಿ",
                    hi: "सत्यापन अनुरोध",
                  })}
                </h2>
                <p>
                  {tr({
                    en: "Send this assigned article to the admin for the Drive link and next steps.",
                    kn: "Drive ಲಿಂಕ್ ಮತ್ತು ಮುಂದಿನ ಹಂತಗಳಿಗಾಗಿ ಈ ನಿಯೋಜಿತ ಲೇಖನವನ್ನು ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಿ.",
                    hi: "Drive लिंक और अगले चरणों के लिए इस असाइन लेख को एडमिन को भेजें।",
                  })}
                </p>
                <div className="confirm-dialog-preview">
                  <span className="confirm-dialog-thumb">
                    <PostThumb src={cardThumbnail(requestTask.thumbnail, requestTask.videoUrl)} eager />
                  </span>
                  <div>
                    <strong>{requestTask.title || requestTask.postId}</strong>
                  </div>
                </div>
                <label className="field" style={{ display: "grid", gap: 6, textAlign: "left", width: "100%" }}>
                  <span>{tr({ en: "Note for admin", kn: "ಆಡ್ಮಿನ್‌ಗೆ ಟಿಪ್ಪಣಿ", hi: "एडमिन के लिए नोट" })}</span>
                  <textarea
                    value={requestNote}
                    onChange={(e) => setRequestNote(e.target.value)}
                    rows={3}
                    maxLength={1000}
                    placeholder={tr({
                      en: "What do you need changed or verified?",
                      kn: "ಏನು ಬದಲಾಯಿಸಬೇಕು ಅಥವಾ ಪರಿಶೀಲಿಸಬೇಕು?",
                      hi: "क्या बदलना या सत्यापित करना है?",
                    })}
                  />
                </label>
                <div className="delete-dialog-actions">
                  <button
                    type="button"
                    className="button button-outline"
                    disabled={pending}
                    onClick={() => setRequestTask(null)}
                  >
                    {tr({ en: "Back", kn: "ಹಿಂದೆ", hi: "वापस" })}
                  </button>
                  <button type="submit" className="button" disabled={pending}>
                    {tr({ en: "Send request", kn: "ವಿನಂತಿ ಕಳುಹಿಸಿ", hi: "अनुरोध भेजें" })}
                  </button>
                </div>
              </form>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
