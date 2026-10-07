"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveAssignment, moveAssignment } from "@/app/admin/desk/actions";
import { storyStates } from "@/lib/v4/workflow";
import { v4 as t, kn } from "@/content/strings.kn";
export type Assignment = {
  id: string;
  title_kn: string;
  status: string;
  assigned_to: string | null;
  deadline_at: string | null;
  priority: number;
  notes: string;
  post_id: string | null;
};
export function StoryDesk({
  rows,
  people,
  posts,
}: {
  rows: Assignment[];
  people: { id: string; full_name: string }[];
  posts: { id: string; title_kn: string }[];
}) {
  const [selected, setSelected] = useState<Assignment | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    router = useRouter();
  return (
    <>
      <p>{t.deskHint}</p>
      <div className="desk-board">
        {storyStates.map((status) => (
          <section key={status} className="desk-column">
            <h2>{status}</h2>
            {rows
              .filter((row) => row.status === status)
              .map((row) => (
                <article key={row.id} className="desk-card">
                  <h3>{row.title_kn}</h3>
                  <p className="meta">
                    {people.find((p) => p.id === row.assigned_to)?.full_name ||
                      t.unassigned}{" "}
                    · P{row.priority}
                  </p>
                  {row.deadline_at && (
                    <time>
                      {new Date(row.deadline_at).toLocaleString("kn-IN", {
                        timeZone: "Asia/Kolkata",
                      })}
                    </time>
                  )}
                  <p>{row.notes}</p>
                  <label className="field">
                    {kn.status}
                    <select
                      aria-label={row.title_kn + " " + kn.status}
                      value={row.status}
                      disabled={busy}
                      onChange={async (e) => {
                        setBusy(true);
                        try {
                          const result = await moveAssignment(
                            row.id,
                            e.target.value,
                          );
                          setMessage(result.error || t.saved);
                          router.refresh();
                        } catch {
                          setMessage(t.failed);
                        } finally {
                          setBusy(false);
                        }
                      }}
                    >
                      {storyStates.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <button className="chip" onClick={() => setSelected(row)}>
                    {t.edit}
                  </button>
                  {row.post_id && (
                    <Link className="chip" href={"/admin/posts/" + row.post_id}>
                      {kn.posts}
                    </Link>
                  )}
                </article>
              ))}
          </section>
        ))}
      </div>
      <h2>{selected ? t.edit : t.newItem}</h2>
      <form
        key={selected?.id || "new"}
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const result = await saveAssignment({
              ...Object.fromEntries(new FormData(e.currentTarget)),
              id: selected?.id,
            });
            setMessage(result.error || t.saved);
            if (!result.error) {
              setSelected(null);
              router.refresh();
            }
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field wide">
          {kn.title}
          <input
            name="title_kn"
            required
            maxLength={200}
            defaultValue={selected?.title_kn}
          />
        </label>
        <label className="field">
          {t.assignee}
          <select name="assigned_to" defaultValue={selected?.assigned_to || ""}>
            <option value="">{t.unassigned}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          {t.deadline}
          <input
            name="deadline_at"
            type="datetime-local"
            defaultValue={
              selected?.deadline_at
                ? new Date(Date.parse(selected.deadline_at) + 19800000)
                    .toISOString()
                    .slice(0, 16)
                : ""
            }
          />
        </label>
        <label className="field">
          {t.priority}
          <select name="priority" defaultValue={selected?.priority || 1}>
            {[1, 2, 3].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="field">
          {kn.posts}
          <select name="post_id" defaultValue={selected?.post_id || ""}>
            <option value="">{t.select}</option>
            {posts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title_kn}
              </option>
            ))}
          </select>
        </label>
        <label className="field wide">
          {t.note}
          <textarea
            name="notes"
            maxLength={5000}
            defaultValue={selected?.notes}
          />
        </label>
        <button disabled={busy} className="button button-ember">
          {kn.save}
        </button>
        {selected && (
          <button
            type="button"
            className="button button-outline"
            onClick={() => setSelected(null)}
          >
            {t.newItem}
          </button>
        )}
      </form>
      <p role="status">{message}</p>
    </>
  );
}
