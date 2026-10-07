"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "./ImageUpload";
import {
  deletePoster,
  savePoster,
  setPosterActive,
} from "@/app/admin/posters/actions";
import {
  groupsForPages,
  posterPageGroups,
  posterSizes,
  posterState,
  type PosterShape,
  type PosterState,
} from "@/lib/ads/posters";
import { kn, v4 as t } from "@/content/strings.kn";

export type PosterRow = {
  id: string;
  advertiser: string;
  shape: PosterShape;
  image_url: string;
  target_url: string | null;
  alt_kn: string;
  alt_en: string;
  alt_hi: string;
  target_pages: string[];
  device: "all" | "mobile" | "desktop";
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  priority: number;
  impressions: number;
  clicks: number;
};

const states: Record<PosterState, string> = {
  live: "ಪ್ರಕಟವಾಗುತ್ತಿದೆ · Live",
  scheduled: "ನಿಗದಿಯಾಗಿದೆ · Scheduled",
  expired: "ಅವಧಿ ಮುಗಿದಿದೆ · Expired",
  off: "ನಿಲ್ಲಿಸಲಾಗಿದೆ · Off",
};
const shapes: Record<PosterShape, string> = {
  landscape: "16:9 ಬ್ಯಾನರ್ · Banner",
  square: "1:1 ಪೋಸ್ಟರ್ · Poster",
};
const durations = [
  ["1 ವಾರ", 7],
  ["15 ದಿನ", 15],
  ["1 ತಿಂಗಳು", 30],
  ["3 ತಿಂಗಳು", 90],
] as const;

/** datetime-local works in the editor's wall clock, which for this desk is India time. */
const toLocal = (iso: string | number) =>
  new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
    .replace(" ", "T")
    .slice(0, 16);
const addDays = (local: string, days: number) =>
  toLocal(Date.parse(local + "+05:30") + days * 86400000);
const shortDate = (iso: string) => toLocal(iso).replace("T", " ");

function pagesLabel(pages: string[]) {
  const groups = groupsForPages(pages);
  if (!pages.length) return "ಎಲ್ಲಾ ಪುಟಗಳು · All pages";
  return posterPageGroups
    .filter((group) => groups.includes(group.key))
    .map((group) => group.kn)
    .join(", ");
}

export function PosterManager({
  rows,
  now,
}: {
  rows: PosterRow[];
  now: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<PosterRow | null>(null),
    [formKey, setFormKey] = useState(0),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const open = (row: PosterRow | null) => {
    setEditing(row);
    setFormKey((k) => k + 1);
    setMessage("");
    document
      .getElementById("poster-form")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const run = async (task: () => Promise<{ error?: string }>) => {
    setBusy(true);
    setMessage("");
    try {
      const result = await task();
      setMessage(result.error || t.saved);
      if (!result.error) router.refresh();
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="poster-admin">
      <section className="utility-panel">
        <h2>ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ</h2>
        <ol>
          <li>
            ಆಕಾರ ಆರಿಸಿ: 16:9 ಬ್ಯಾನರ್ (1280×720) ಪುಟದ ಅಗಲದ ಸ್ಥಳಗಳಿಗೆ, 1:1 ಪೋಸ್ಟರ್
            (1080×1080) ಬದಿಯ ಸ್ಥಳಗಳಿಗೆ.
          </li>
          <li>ಚಿತ್ರ ಅಪ್‌ಲೋಡ್ ಮಾಡಿ; ಅದು ಆ ಅಳತೆಗೆ ಮಧ್ಯದಿಂದ ಕತ್ತರಿಸಲ್ಪಡುತ್ತದೆ.</li>
          <li>
            ಪುಟಗಳನ್ನು ಆರಿಸಿ. ಯಾವುದನ್ನೂ ಆರಿಸದಿದ್ದರೆ ಎಲ್ಲಾ ಪುಟಗಳಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.
          </li>
          <li>
            ಆರಂಭ ಮತ್ತು ಮುಕ್ತಾಯ ಸಮಯ ಹಾಕಿ. ಆರಂಭದ ಸಮಯದಲ್ಲಿ ತಾನಾಗಿ ಕಾಣಿಸುತ್ತದೆ,
            ಮುಕ್ತಾಯದ ನಂತರ ತಾನಾಗಿ ನಿಲ್ಲುತ್ತದೆ ಮತ್ತು ಕ್ಲಿಕ್ ಆಗುವುದಿಲ್ಲ.
          </li>
        </ol>
      </section>

      <div className="article-actions">
        <button
          type="button"
          className="button button-ember"
          onClick={() => open(null)}
        >
          {t.newItem}
        </button>
      </div>

      {rows.length > 0 && (
        <ul className="poster-list">
          {rows.map((row) => {
            const state = posterState(row, now);
            return (
              <li key={row.id} className="poster-card">
                <span
                  className="poster-thumb"
                  data-shape={row.shape}
                  aria-hidden="true"
                >
                  {/* Admin-only thumbnail of an already-optimised upload. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image_url} alt="" loading="lazy" />
                </span>
                <div className="poster-card-body">
                  <span className="poster-status" data-state={state}>
                    {states[state]}
                  </span>
                  <h3>{row.advertiser}</h3>
                  <p className="meta">
                    {shapes[row.shape]} · {pagesLabel(row.target_pages)}
                  </p>
                  <p className="meta">
                    {shortDate(row.starts_at)} → {shortDate(row.ends_at)}
                  </p>
                  <p className="meta">
                    {t.impressions}: {row.impressions} · {t.clicks}:{" "}
                    {row.clicks}
                  </p>
                  <div className="poster-card-actions">
                    <button
                      type="button"
                      className="chip"
                      onClick={() => open(row)}
                    >
                      ಸಂಪಾದಿಸಿ · Edit
                    </button>
                    {state !== "expired" && (
                      <button
                        type="button"
                        className="chip"
                        disabled={busy}
                        onClick={() =>
                          run(() => setPosterActive(row.id, !row.is_active))
                        }
                      >
                        {row.is_active
                          ? "ನಿಲ್ಲಿಸಿ · Turn off"
                          : "ಆರಂಭಿಸಿ · Turn on"}
                      </button>
                    )}
                    <button
                      type="button"
                      className="chip"
                      disabled={busy}
                      onClick={() => {
                        if (window.confirm(t.confirmDelete))
                          run(() => deletePoster(row.id));
                      }}
                    >
                      {t.delete}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PosterForm
        key={formKey}
        row={editing}
        now={now}
        busy={busy}
        onSubmit={(values) =>
          run(async () => {
            const result = await savePoster(editing?.id || null, values);
            if (!result.error) open(null);
            return result;
          })
        }
      />
      <p role="status">{message}</p>
    </div>
  );
}

function PosterForm({
  row,
  now,
  busy,
  onSubmit,
}: {
  row: PosterRow | null;
  now: number;
  busy: boolean;
  onSubmit: (values: Record<string, unknown>) => void;
}) {
  const [shape, setShape] = useState<PosterShape>(row?.shape || "landscape"),
    [image, setImage] = useState(row?.image_url || ""),
    [starts, setStarts] = useState(row ? toLocal(row.starts_at) : toLocal(now)),
    [ends, setEnds] = useState(
      row ? toLocal(row.ends_at) : addDays(toLocal(now), 30),
    );
  const groups = row ? groupsForPages(row.target_pages) : [];
  const size = posterSizes[shape];
  return (
    <form
      id="poster-form"
      className="form-grid poster-form"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onSubmit({
          advertiser: data.get("advertiser"),
          shape,
          image_url: image,
          target_url: data.get("target_url"),
          alt_kn: data.get("alt_kn"),
          alt_en: data.get("alt_en"),
          alt_hi: data.get("alt_hi"),
          pages: data.getAll("pages"),
          device: data.get("device"),
          starts_at: starts,
          ends_at: ends,
          is_active: data.has("is_active"),
          priority: data.get("priority"),
        });
      }}
    >
      <h2 className="field wide">
        {row ? "ಪೋಸ್ಟರ್ ಸಂಪಾದನೆ · Edit poster" : "ಹೊಸ ಪೋಸ್ಟರ್ · New poster"}
      </h2>
      <fieldset className="field wide poster-shape-choice">
        <legend>1. ಆಕಾರ · Shape</legend>
        {(Object.keys(shapes) as PosterShape[]).map((value) => (
          <label key={value} data-checked={shape === value}>
            <input
              type="radio"
              name="shape"
              value={value}
              checked={shape === value}
              onChange={() => {
                setShape(value);
                // The stored image was cropped for the other shape.
                if (value !== shape) setImage("");
              }}
            />
            <span className="poster-shape-icon" data-shape={value} />
            {shapes[value]}
            <small>
              {posterSizes[value].width}×{posterSizes[value].height}
            </small>
          </label>
        ))}
      </fieldset>
      <fieldset className="field wide">
        <legend>2. ಚಿತ್ರ · Image</legend>
        <div className="poster-preview" data-shape={shape}>
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" />
          ) : (
            <span>
              {size.width}×{size.height}
            </span>
          )}
        </div>
        <ImageUpload kind="ad" shape={shape} onUploaded={setImage} />
        <label className="field">
          Image URL
          <input
            value={image}
            onChange={(event) => setImage(event.target.value)}
            required
          />
        </label>
      </fieldset>
      <label className="field">
        ಜಾಹೀರಾತುದಾರ · Advertiser
        <input
          name="advertiser"
          required
          maxLength={150}
          defaultValue={row?.advertiser}
        />
      </label>
      <label className="field">
        ಲಿಂಕ್ (ಐಚ್ಛಿಕ, https://) · Link
        <input
          name="target_url"
          type="url"
          pattern="https://.*"
          defaultValue={row?.target_url || ""}
        />
      </label>
      <label className="field">
        ಚಿತ್ರ ವಿವರಣೆ · Alt text (ಕನ್ನಡ)
        <input
          name="alt_kn"
          required
          maxLength={300}
          defaultValue={row?.alt_kn}
        />
      </label>
      <label className="field">
        Alt text (English)
        <input name="alt_en" maxLength={300} defaultValue={row?.alt_en} />
      </label>
      <label className="field">
        Alt text (हिंदी)
        <input name="alt_hi" maxLength={300} defaultValue={row?.alt_hi} />
      </label>
      <fieldset className="field wide poster-pages">
        <legend>3. ಪುಟಗಳು · Pages (ಖಾಲಿ = ಎಲ್ಲಾ ಪುಟಗಳು)</legend>
        {posterPageGroups.map((group) => (
          <label key={group.key}>
            <input
              type="checkbox"
              name="pages"
              value={group.key}
              defaultChecked={groups.includes(group.key)}
            />
            {group.kn} <small lang="en">{group.en}</small>
          </label>
        ))}
      </fieldset>
      <fieldset className="field wide">
        <legend>4. ಅವಧಿ · Schedule (IST)</legend>
        <div className="poster-dates">
          <label className="field">
            {t.start}
            <input
              type="datetime-local"
              required
              value={starts}
              onChange={(event) => setStarts(event.target.value)}
            />
          </label>
          <label className="field">
            {t.end}
            <input
              type="datetime-local"
              required
              min={starts}
              value={ends}
              onChange={(event) => setEnds(event.target.value)}
            />
          </label>
        </div>
        <div className="category-chips">
          {durations.map(([label, days]) => (
            <button
              type="button"
              className="chip"
              key={days}
              onClick={() => setEnds(addDays(starts, days))}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        ಸಾಧನ · Device
        <select name="device" defaultValue={row?.device || "all"}>
          <option value="all">ಎಲ್ಲಾ · All</option>
          <option value="mobile">ಮೊಬೈಲ್ · Mobile</option>
          <option value="desktop">ಡೆಸ್ಕ್‌ಟಾಪ್ · Desktop</option>
        </select>
      </label>
      <label className="field">
        {t.priority}
        <input
          name="priority"
          type="number"
          min={-100}
          max={100}
          defaultValue={row?.priority ?? 0}
        />
      </label>
      <label className="field">
        {t.enabled}
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={row?.is_active ?? true}
        />
      </label>
      <div className="field wide">
        <button className="button button-ember" disabled={busy || !image}>
          {busy ? t.loading : kn.save}
        </button>
      </div>
    </form>
  );
}
