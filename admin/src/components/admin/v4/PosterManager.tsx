"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";

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

const states: Record<PosterState, Tri> = {
  live: { en: "Live", kn: "ಪ್ರಕಟವಾಗುತ್ತಿದೆ", hi: "चालू" },
  scheduled: { en: "Scheduled", kn: "ನಿಗದಿಯಾಗಿದೆ", hi: "निर्धारित" },
  expired: { en: "Expired", kn: "ಅವಧಿ ಮುಗಿದಿದೆ", hi: "समाप्त" },
  off: { en: "Off", kn: "ನಿಲ್ಲಿಸಲಾಗಿದೆ", hi: "बंद" },
};
const shapes: Record<PosterShape, Tri> = {
  landscape: { en: "16:9 Banner", kn: "16:9 ಬ್ಯಾನರ್", hi: "16:9 बैनर" },
  square: { en: "1:1 Poster", kn: "1:1 ಪೋಸ್ಟರ್", hi: "1:1 पोस्टर" },
};
const durations = [
  [{ en: "1 week", kn: "1 ವಾರ", hi: "1 सप्ताह" }, 7],
  [{ en: "15 days", kn: "15 ದಿನ", hi: "15 दिन" }, 15],
  [{ en: "1 month", kn: "1 ತಿಂಗಳು", hi: "1 महीना" }, 30],
  [{ en: "3 months", kn: "3 ತಿಂಗಳು", hi: "3 महीने" }, 90],
] as const satisfies readonly (readonly [Tri, number])[];
const groupsHi: Record<string, string> = {
  home: "मुखपृष्ठ",
  news: "समाचार और लेख",
  videos: "वीडियो, शॉर्ट्स और लाइव",
  categories: "श्रेणी, टैग, विषय और शृंखला",
  districts: "ज़िले और कस्बे",
  events: "कार्यक्रम और जैन पंचांग",
  community: "बसदि, सूचनाएँ और अवसर",
  gallery: "चित्र संग्रह और वेब स्टोरीज़",
  utilities: "मौसम, जलाशय और दरें",
  engagement: "सर्वेक्षण और प्रश्नोत्तरी",
};
const groupLabel = (group: (typeof posterPageGroups)[number]): Tri => ({
  kn: group.kn,
  en: group.en,
  hi: groupsHi[group.key] || group.en,
});

/** datetime-local works in the editor's wall clock, which for this desk is India time. */
const toLocal = (iso: string | number) =>
  new Date(iso)
    .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
    .replace(" ", "T")
    .slice(0, 16);
const addDays = (local: string, days: number) =>
  toLocal(Date.parse(local + "+05:30") + days * 86400000);
const shortDate = (iso: string) => toLocal(iso).replace("T", " ");

function pagesLabel(pages: string[], tr: (text: Tri) => string) {
  const groups = groupsForPages(pages);
  if (!pages.length)
    return tr({ en: "All pages", kn: "ಎಲ್ಲಾ ಪುಟಗಳು", hi: "सभी पृष्ठ" });
  return posterPageGroups
    .filter((group) => groups.includes(group.key))
    .map((group) => tr(groupLabel(group)))
    .join(", ");
}

export function PosterManager({
  rows,
  now,
}: {
  rows: PosterRow[];
  now: number;
}) {
  const { v4: t, tr } = useUiStrings();
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
        <h2>
          {tr({
            en: "How it works",
            kn: "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ",
            hi: "यह कैसे काम करता है",
          })}
        </h2>
        <ol>
          <li>
            {tr({
              en: "Choose a shape: a 16:9 banner (1280×720) for full-width spaces, a 1:1 poster (1080×1080) for side spaces.",
              kn: "ಆಕಾರ ಆರಿಸಿ: 16:9 ಬ್ಯಾನರ್ (1280×720) ಪುಟದ ಅಗಲದ ಸ್ಥಳಗಳಿಗೆ, 1:1 ಪೋಸ್ಟರ್ (1080×1080) ಬದಿಯ ಸ್ಥಳಗಳಿಗೆ.",
              hi: "आकार चुनें: पूरी चौड़ाई वाले स्थानों के लिए 16:9 बैनर (1280×720), किनारे के स्थानों के लिए 1:1 पोस्टर (1080×1080)।",
            })}
          </li>
          <li>
            {tr({
              en: "Paste the ImageKit link of an image already sized to that shape. Images are not uploaded to our server.",
              kn: "ಆ ಅಳತೆಗೆ ಸಿದ್ಧಪಡಿಸಿದ ಚಿತ್ರದ ImageKit ಲಿಂಕ್ ಅಂಟಿಸಿ. ಚಿತ್ರಗಳನ್ನು ನಮ್ಮ ಸರ್ವರ್‌ಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡುವುದಿಲ್ಲ.",
              hi: "उस आकार में तैयार चित्र का ImageKit लिंक चिपकाएँ। चित्र हमारे सर्वर पर अपलोड नहीं होते।",
            })}
          </li>
          <li>
            {tr({
              en: "Choose the pages. If none are chosen, it appears on all pages.",
              kn: "ಪುಟಗಳನ್ನು ಆರಿಸಿ. ಯಾವುದನ್ನೂ ಆರಿಸದಿದ್ದರೆ ಎಲ್ಲಾ ಪುಟಗಳಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ.",
              hi: "पृष्ठ चुनें। कोई भी न चुनने पर यह सभी पृष्ठों पर दिखेगा।",
            })}
          </li>
          <li>
            {tr({
              en: "Set the start and end time. It appears automatically at the start time, stops automatically after the end, and can no longer be clicked.",
              kn: "ಆರಂಭ ಮತ್ತು ಮುಕ್ತಾಯ ಸಮಯ ಹಾಕಿ. ಆರಂಭದ ಸಮಯದಲ್ಲಿ ತಾನಾಗಿ ಕಾಣಿಸುತ್ತದೆ, ಮುಕ್ತಾಯದ ನಂತರ ತಾನಾಗಿ ನಿಲ್ಲುತ್ತದೆ ಮತ್ತು ಕ್ಲಿಕ್ ಆಗುವುದಿಲ್ಲ.",
              hi: "शुरू और समाप्ति का समय डालें। यह शुरू के समय अपने-आप दिखेगा, समाप्ति के बाद अपने-आप रुक जाएगा और क्लिक नहीं होगा।",
            })}
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
                  {/* Admin-only thumbnail of the linked ImageKit image. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={row.image_url} alt="" loading="lazy" />
                </span>
                <div className="poster-card-body">
                  <span className="poster-status" data-state={state}>
                    {tr(states[state])}
                  </span>
                  <h3>{row.advertiser}</h3>
                  <p className="meta">
                    {tr(shapes[row.shape])} ·{" "}
                    {pagesLabel(row.target_pages, tr)}
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
                      {tr({ en: "Edit", kn: "ಸಂಪಾದಿಸಿ", hi: "संपादित करें" })}
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
                          ? tr({ en: "Turn off", kn: "ನಿಲ್ಲಿಸಿ", hi: "बंद करें" })
                          : tr({
                              en: "Turn on",
                              kn: "ಆರಂಭಿಸಿ",
                              hi: "चालू करें",
                            })}
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
  const { kn, v4: t, tr } = useUiStrings();
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
        {row
          ? tr({
              en: "Edit poster",
              kn: "ಪೋಸ್ಟರ್ ಸಂಪಾದನೆ",
              hi: "पोस्टर संपादित करें",
            })
          : tr({ en: "New poster", kn: "ಹೊಸ ಪೋಸ್ಟರ್", hi: "नया पोस्टर" })}
      </h2>
      <fieldset className="field wide poster-shape-choice">
        <legend>1. {tr({ en: "Shape", kn: "ಆಕಾರ", hi: "आकार" })}</legend>
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
            {tr(shapes[value])}
            <small>
              {posterSizes[value].width}×{posterSizes[value].height}
            </small>
          </label>
        ))}
      </fieldset>
      <fieldset className="field wide">
        <legend>2. {tr({ en: "Image", kn: "ಚಿತ್ರ", hi: "चित्र" })}</legend>
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
        <label className="field">
          {tr({ en: "Image URL", kn: "ಚಿತ್ರದ URL", hi: "चित्र URL" })}
          <input
            value={image}
            onChange={(event) => setImage(event.target.value)}
            required
          />
        </label>
      </fieldset>
      <label className="field">
        {tr({ en: "Advertiser", kn: "ಜಾಹೀರಾತುದಾರ", hi: "विज्ञापनदाता" })}
        <input
          name="advertiser"
          required
          maxLength={150}
          defaultValue={row?.advertiser}
        />
      </label>
      <label className="field">
        {tr({
          en: "Link (optional, https://)",
          kn: "ಲಿಂಕ್ (ಐಚ್ಛಿಕ, https://)",
          hi: "लिंक (वैकल्पिक, https://)",
        })}
        <input
          name="target_url"
          type="url"
          pattern="https://.*"
          defaultValue={row?.target_url || ""}
        />
      </label>
      <label className="field">
        {tr({
          en: "Alt text (Kannada)",
          kn: "ಚಿತ್ರ ವಿವರಣೆ (ಕನ್ನಡ)",
          hi: "वैकल्पिक पाठ (कन्नड़)",
        })}
        <input
          name="alt_kn"
          required
          maxLength={300}
          defaultValue={row?.alt_kn}
        />
      </label>
      <label className="field">
        {tr({
          en: "Alt text (English)",
          kn: "ಚಿತ್ರ ವಿವರಣೆ (ಇಂಗ್ಲಿಷ್)",
          hi: "वैकल्पिक पाठ (अंग्रेज़ी)",
        })}
        <input name="alt_en" maxLength={300} defaultValue={row?.alt_en} />
      </label>
      <label className="field">
        {tr({
          en: "Alt text (Hindi)",
          kn: "ಚಿತ್ರ ವಿವರಣೆ (ಹಿಂದಿ)",
          hi: "वैकल्पिक पाठ (हिंदी)",
        })}
        <input name="alt_hi" maxLength={300} defaultValue={row?.alt_hi} />
      </label>
      <fieldset className="field wide poster-pages">
        <legend>
          3.{" "}
          {tr({
            en: "Pages (empty = all pages)",
            kn: "ಪುಟಗಳು (ಖಾಲಿ = ಎಲ್ಲಾ ಪುಟಗಳು)",
            hi: "पृष्ठ (खाली = सभी पृष्ठ)",
          })}
        </legend>
        {posterPageGroups.map((group) => (
          <label key={group.key}>
            <input
              type="checkbox"
              name="pages"
              value={group.key}
              defaultChecked={groups.includes(group.key)}
            />
            {tr(groupLabel(group))}
          </label>
        ))}
      </fieldset>
      <fieldset className="field wide">
        <legend>
          4.{" "}
          {tr({
            en: "Schedule (IST)",
            kn: "ಅವಧಿ (IST)",
            hi: "समय-सारणी (IST)",
          })}
        </legend>
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
              {tr(label)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="field">
        {tr({ en: "Device", kn: "ಸಾಧನ", hi: "डिवाइस" })}
        <select name="device" defaultValue={row?.device || "all"}>
          <option value="all">
            {tr({ en: "All", kn: "ಎಲ್ಲಾ", hi: "सभी" })}
          </option>
          <option value="mobile">
            {tr({ en: "Mobile", kn: "ಮೊಬೈಲ್", hi: "मोबाइल" })}
          </option>
          <option value="desktop">
            {tr({ en: "Desktop", kn: "ಡೆಸ್ಕ್‌ಟಾಪ್", hi: "डेस्कटॉप" })}
          </option>
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
