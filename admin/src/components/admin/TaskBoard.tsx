"use client";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CircleAlert, ExternalLink, Pencil } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { ArticleCardSearch } from "@/components/admin/ArticleCardSearch";
import { PostThumb } from "@/components/admin/PostThumb";
import { site } from "@/config/site";
import type { Tri } from "@/lib/i18n/strings";
import { youtubeThumbnail } from "@/lib/utils/images";
import {
  assignBulkRange,
  assignSingleArticle,
  setTaskStatus,
} from "@/app/admin/tasks/actions";

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

type Props = {
  isAdmin: boolean;
  totalArticles: number;
  staff: StaffOption[];
  tasks: TaskRow[];
};

export function TaskBoard({ isAdmin, totalArticles, staff, tasks }: Props) {
  const { tr } = useUiStrings();
  const router = useRouter();
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

  useEffect(() => {
    if (!cancelTask) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setCancelTask(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cancelTask, pending]);

  const visible = useMemo(() => {
    return tasks.filter((t) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (isAdmin && filterAssignee !== "all" && t.assigneeId !== filterAssignee) return false;
      return true;
    });
  }, [tasks, filterStatus, filterAssignee, isAdmin]);

  function run(action: () => Promise<{ ok?: true; error?: string; assigned?: number }>, done: string) {
    setMessage({});
    start(async () => {
      const result = await action();
      if (result.error) setMessage({ error: result.error });
      else {
        const extra =
          typeof result.assigned === "number"
            ? tr({
                en: ` Assigned ${result.assigned}.`,
                kn: ` ${result.assigned} ನಿಯೋಜಿಸಲಾಯಿತು.`,
                hi: ` ${result.assigned} असाइन हुए।`,
              })
            : "";
        setMessage({ ok: done + extra });
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
              en: `${totalArticles.toLocaleString("en-IN")} articles in the library. Assign a single piece or a numbered block (for example 1–1000, 1001–2000) to different staff. Staff can edit only articles assigned to them. Super admins can open and edit any article at any time — no assignment needed.`,
              kn: `ಲೈಬ್ರರಿಯಲ್ಲಿ ${totalArticles.toLocaleString("en-IN")} ಲೇಖನಗಳಿವೆ. ಒಂದು ಲೇಖನ ಅಥವಾ ಸಂಖ್ಯೆಯ ವ್ಯಾಪ್ತಿ (ಉದಾ. 1–1000, 1001–2000) ಸಿಬ್ಬಂದಿಗೆ ನಿಯೋಜಿಸಿ. ಸಿಬ್ಬಂದಿ ತಮಗೆ ನಿಯೋಜಿಸಿದ ಲೇಖನಗಳನ್ನು ಮಾತ್ರ ಸಂಪಾದಿಸಬಹುದು. ಸೂಪರ್ ಅಡ್ಮಿನ್‌ಗಳು ಯಾವುದೇ ಲೇಖನವನ್ನು ಯಾವಾಗ ಬೇಕಾದರೂ ಸಂಪಾದಿಸಬಹುದು — ನಿಯೋಜನೆ ಬೇಕಿಲ್ಲ.`,
              hi: `लाइब्रेरी में ${totalArticles.toLocaleString("en-IN")} लेख हैं। एक लेख या संख्या ब्लॉक (जैसे 1–1000, 1001–2000) अलग-अलग स्टाफ़ को दें। स्टाफ़ केवल असाइन लेख संपादित कर सकते हैं। सुपर एडमिन किसी भी लेख को कभी भी संपादित कर सकते हैं — असाइनमेंट ज़रूरी नहीं।`,
            })
          : tr({
              en: `You have ${openCount} open article task${openCount === 1 ? "" : "s"}. Open an article to edit it, then mark the task done.`,
              kn: `ನಿಮಗೆ ${openCount} ತೆರೆದ ಲೇಖನ ಕಾರ್ಯ${openCount === 1 ? "" : "ಗಳು"} ಇವೆ. ಸಂಪಾದಿಸಲು ಲೇಖನ ತೆರೆಯಿರಿ, ನಂತರ ಕಾರ್ಯ ಮುಗಿದಿದೆ ಎಂದು ಗುರುತಿಸಿ.`,
              hi: `आपके ${openCount} खुले लेख कार्य हैं। संपादन के लिए लेख खोलें, फिर कार्य पूर्ण चिह्नित करें।`,
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
          <div className="page-actions" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
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

        {!visible.length ? (
          <p>
            {tr({
              en: "No assignments in this view yet.",
              kn: "ಈ ನೋಟದಲ್ಲಿ ಇನ್ನೂ ನಿಯೋಜನೆಗಳಿಲ್ಲ.",
              hi: "इस दृश्य में अभी कोई असाइनमेंट नहीं।",
            })}
          </p>
        ) : (
          <div className="post-card-list">
            {visible.map((task, index) => (
              <article
                key={task.id}
                className={"post-card is-" + (task.postStatus || "draft")}
                style={{ animationDelay: Math.min(index, 11) * 45 + "ms" }}
              >
                <div className="post-card-thumb">
                  <PostThumb
                    src={cardThumbnail(task.thumbnail, task.videoUrl)}
                    eager={index < 6}
                  />
                  <div className="post-card-badges">
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
                    <span className={"status-pill is-" + (task.status === "open" ? "scheduled" : task.status === "done" ? "published" : "archived")}>
                      {taskStatusNames[task.status] ? tr(taskStatusNames[task.status]) : task.status}
                    </span>
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
                    <Link href={"/admin/posts/" + task.postId} prefetch={false}>
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
                    <Link
                      href={"/admin/posts/" + task.postId}
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
                        {tr({ en: "Cancel", kn: "ರದ್ದು", hi: "रद्द" })}
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
                    en: "Are you sure?",
                    kn: "ನೀವು ಖಚಿತವೇ?",
                    hi: "क्या आप सुनिश्चित हैं?",
                  })}
                </h2>
                <p>
                  {tr({
                    en: "This will cancel the assignment. The staff member will no longer be able to edit this article from Tasks.",
                    kn: "ಇದು ನಿಯೋಜನೆಯನ್ನು ರದ್ದುಗೊಳಿಸುತ್ತದೆ. ಸಿಬ್ಬಂದಿ ಈ ಲೇಖನವನ್ನು ಕಾರ್ಯಗಳಿಂದ ಸಂಪಾದಿಸಲು ಸಾಧ್ಯವಾಗುವುದಿಲ್ಲ.",
                    hi: "यह असाइनमेंट रद्द कर देगा। स्टाफ़ Tasks से इस लेख को संपादित नहीं कर पाएगा।",
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
                    {tr({ en: "Keep assignment", kn: "ನಿಯೋಜನೆ ಇರಿಸಿ", hi: "असाइनमेंट रखें" })}
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
                          en: "Assignment cancelled.",
                          kn: "ನಿಯೋಜನೆ ರದ್ದು.",
                          hi: "असाइनमेंट रद्द।",
                        }),
                      );
                    }}
                  >
                    {tr({
                      en: "Yes, cancel it",
                      kn: "ಹೌದು, ರದ್ದುಮಾಡಿ",
                      hi: "हाँ, रद्द करें",
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
