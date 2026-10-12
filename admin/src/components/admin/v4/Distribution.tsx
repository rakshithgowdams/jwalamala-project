"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDistribution,
  editDistributionDraft,
  makeDistributionDraft,
  queueDistribution,
  connectSocial,
} from "@/app/admin/distribution/actions";
import { ConfirmDeleteButton } from "../ConfirmDeleteButton";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function Distribution({
  kind,
  posts,
  rows,
}: {
  kind: "newsletter" | "social";
  posts: { id: string; title_kn: string }[];
  rows: Record<string, unknown>[];
}) {
  const { kn, v4: t } = useUiStrings();
  const [selected, setSelected] = useState<string[]>([]),
    [message, setMessage] = useState(""),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    router = useRouter();
  return (
    <>
      <p>{t.distributionReview}</p>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const result = await makeDistributionDraft({
              kind: kind === "newsletter" ? kind : f.get("network"),
              ids: selected,
              subject: f.get("subject"),
              note: f.get("note"),
            });
            setMessage(result.error || t.saved);
            if (result.text) setText(result.text);
            router.refresh();
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field wide">
          {kn.title}
          <input name="subject" required maxLength={200} />
        </label>
        {kind === "social" && (
          <label className="field">
            {t.network}
            <select name="network">
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="facebook">Facebook</option>
            </select>
          </label>
        )}
        <label className="field wide">
          {t.note}
          <textarea name="note" maxLength={2000} />
        </label>
        <fieldset className="wide">
          <legend>{kn.posts}</legend>
          {posts.map((p) => (
            <label className="poll-option" key={p.id}>
              <input
                type="checkbox"
                checked={selected.includes(p.id)}
                onChange={() =>
                  setSelected(
                    selected.includes(p.id)
                      ? selected.filter((id) => id !== p.id)
                      : [...selected, p.id],
                  )
                }
              />
              {p.title_kn}
            </label>
          ))}
        </fieldset>
        <button
          disabled={!selected.length || busy}
          className="button button-ember"
        >
          {t.createDraft}
        </button>
      </form>
      {text && (
        <section className="utility-panel">
          <pre className="version-source">{text}</pre>
          <button
            className="button button-outline"
            onClick={async () => {
              await navigator.clipboard.writeText(text);
              setMessage(kn.copied);
            }}
          >
            {kn.share}
          </button>
        </section>
      )}
      <p role="status">{message}</p>
      {rows.map((row) => (
        <section key={String(row.id)} className="utility-panel">
          <h2>{String(row.subject || row.network)}</h2>
          <span className="chip">{String(row.status)}</span>
          {kind === "newsletter" ? (
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: String(row.html || "") }}
            />
          ) : (
            <p style={{ whiteSpace: "pre-wrap" }}>{String(row.caption)}</p>
          )}
          {row.status === "draft" && (
            <DistributionDraft kind={kind} row={row} />
          )}
          {row.status === "draft" && (
            <button
              disabled={busy}
              className="button button-ember"
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await queueDistribution(kind, String(row.id));
                  setMessage(result.error || t.queued);
                  router.refresh();
                } catch {
                  setMessage(t.failed);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.approveAndQueue}
            </button>
          )}
          {row.status !== "queued" && (
            <div className="distribution-manage">
              <ConfirmDeleteButton action={() => deleteDistribution(kind, String(row.id))} />
            </div>
          )}
        </section>
      ))}
    </>
  );
}
export function SocialConnection() {
  const { kn, v4: t } = useUiStrings();
  const [message, setMessage] = useState("");
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget,
          f = new FormData(form),
          result = await connectSocial({
            ...Object.fromEntries(f),
            enabled: f.has("enabled"),
          });
        setMessage(result.error || t.saved);
        if (!result.error) form.reset();
      }}
    >
      <label className="field">
        {t.network}
        <select name="network">
          <option>telegram</option>
          <option>facebook</option>
        </select>
      </label>
      <label className="field">
        {t.channelId}
        <input name="page_id" required />
      </label>
      <label className="field wide">
        {t.accessToken}
        <input
          name="token"
          type="password"
          autoComplete="new-password"
          required
        />
      </label>
      <label className="poll-option">
        <input type="checkbox" name="enabled" />
        {t.enabled}
      </label>
      <button className="button button-ember">{kn.save}</button>
      <p role="status">{message}</p>
    </form>
  );
}

function DistributionDraft({
  kind,
  row,
}: {
  kind: "newsletter" | "social";
  row: Record<string, unknown>;
}) {
  const { kn, v4: t, tr } = useUiStrings();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <details>
      <summary>
        {tr({
          en: "Edit draft",
          kn: "ಕರಡು ತಿದ್ದಿ",
          hi: "ड्राफ़्ट संपादित करें",
        })}
      </summary>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            const r = await editDistributionDraft({
              kind,
              id: row.id,
              subject: String(f.get("subject") || ""),
              content: f.get("content"),
            });
            setMessage(r.error || t.saved);
            router.refresh();
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {kind === "newsletter" && (
          <label className="field wide">
            {tr({ en: "Subject", kn: "ವಿಷಯ", hi: "विषय" })}
            <input
              name="subject"
              defaultValue={String(row.subject || "")}
              maxLength={200}
              required
            />
          </label>
        )}
        <label className="field wide">
          {kind === "newsletter"
            ? tr({
                en: "Newsletter HTML",
                kn: "ಸುದ್ದಿಪತ್ರ HTML",
                hi: "न्यूज़लेटर HTML",
              })
            : tr({ en: "Caption", kn: "ಶೀರ್ಷಿಕೆ ಬರಹ", hi: "कैप्शन" })}
          <textarea
            name="content"
            defaultValue={String(
              kind === "newsletter" ? row.html : row.caption,
            )}
            rows={10}
            maxLength={kind === "newsletter" ? 50000 : 4000}
            required
          />
        </label>
        <button className="button button-outline" disabled={busy}>
          {kn.save}
        </button>
        <p role="status">{message}</p>
      </form>
    </details>
  );
}
