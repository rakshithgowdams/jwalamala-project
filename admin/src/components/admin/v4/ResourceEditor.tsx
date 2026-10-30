"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4Resources, type V4Resource } from "@/lib/v4/admin-schema";
import {
  saveV4,
  saveRelationships,
  mergeTags,
  deleteV4,
  saveDistrictOrder,
} from "@/app/admin/v4/actions";
import { StructuredEditor } from "./StructuredEditor";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";
import { isHostedImage } from "@/lib/utils/images";
import type { PlaceOption } from "@/lib/places/search";
import { PlacePicker } from "../PlacePicker";
export type Choice = { id: string; label: string } & Partial<Omit<PlaceOption, "id">>;
const choiceLabels: Record<string, Tri> = {
  draft: { en: "Draft", kn: "ಕರಡು", hi: "ड्राफ़्ट" },
  published: { en: "Published", kn: "ಪ್ರಕಟಿತ", hi: "प्रकाशित" },
  pending: { en: "Pending review", kn: "ಪರಿಶೀಲನೆಗೆ ಬಾಕಿ", hi: "समीक्षा लंबित" },
  approved: { en: "Approved", kn: "ಅನುಮೋದಿತ", hi: "स्वीकृत" },
  rejected: { en: "Rejected", kn: "ತಿರಸ್ಕೃತ", hi: "अस्वीकृत" },
  active: { en: "Active", kn: "ಸಕ್ರಿಯ", hi: "सक्रिय" },
  closed: { en: "Closed", kn: "ಮುಕ್ತಾಯ", hi: "बंद" },
  tag: { en: "Tag", kn: "ಟ್ಯಾಗ್", hi: "टैग" },
  topic: { en: "Topic", kn: "ವಿಷಯ", hi: "विषय" },
  page: { en: "Page", kn: "ಪುಟ", hi: "पृष्ठ" },
  category: { en: "Category", kn: "ವರ್ಗ", hi: "श्रेणी" },
  external: { en: "External link", kn: "ಹೊರಗಿನ ಲಿಂಕ್", hi: "बाहरी लिंक" },
  live: { en: "Live", kn: "ನೇರಪ್ರಸಾರ", hi: "लाइव" },
  parva: { en: "Parva", kn: "ಪರ್ವ", hi: "पर्व" },
  tithi: { en: "Tithi", kn: "ತಿಥಿ", hi: "तिथि" },
  festival: { en: "Festival", kn: "ಹಬ್ಬ", hi: "त्योहार" },
  note: { en: "Note", kn: "ಟಿಪ್ಪಣಿ", hi: "टिप्पणी" },
  job: { en: "Job", kn: "ಉದ್ಯೋಗ", hi: "नौकरी" },
  scholarship: { en: "Scholarship", kn: "ವಿದ್ಯಾರ್ಥಿವೇತನ", hi: "छात्रवृत्ति" },
  competition: { en: "Competition", kn: "ಸ್ಪರ್ಧೆ", hi: "प्रतियोगिता" },
  admission: { en: "Admission", kn: "ಪ್ರವೇಶಾತಿ", hi: "प्रवेश" },
  shraddhanjali: { en: "Tribute", kn: "ಶ್ರದ್ಧಾಂಜಲಿ", hi: "श्रद्धांजलि" },
  abhinandane: { en: "Congratulations", kn: "ಅಭಿನಂದನೆ", hi: "अभिनंदन" },
  amantrana: { en: "Invitation", kn: "ಆಮಂತ್ರಣ", hi: "आमंत्रण" },
  anniversary: { en: "Anniversary", kn: "ವಾರ್ಷಿಕೋತ್ಸವ", hi: "वर्षगांठ" },
  sanmana: { en: "Felicitation", kn: "ಸನ್ಮಾನ", hi: "सम्मान" },
  student_achievement: {
    en: "Student achievement",
    kn: "ವಿದ್ಯಾರ್ಥಿ ಸಾಧನೆ",
    hi: "छात्र उपलब्धि",
  },
  gold22: { en: "Gold 22K", kn: "ಚಿನ್ನ 22K", hi: "सोना 22K" },
  gold24: { en: "Gold 24K", kn: "ಚಿನ್ನ 24K", hi: "सोना 24K" },
  silver: { en: "Silver", kn: "ಬೆಳ್ಳಿ", hi: "चांदी" },
  petrol: { en: "Petrol", kn: "ಪೆಟ್ರೋಲ್", hi: "पेट्रोल" },
  diesel: { en: "Diesel", kn: "ಡೀಸೆಲ್", hi: "डीज़ल" },
};
const fixedLabels: Record<string, Tri> = {
  "ಪಾವತಿ / Payment": { en: "Payment", kn: "ಪಾವತಿ / Payment", hi: "भुगतान" },
  "ಮೊತ್ತ (₹) / Amount": {
    en: "Amount (₹)",
    kn: "ಮೊತ್ತ (₹) / Amount",
    hi: "राशि (₹)",
  },
  "ರಸೀದಿ / Receipt reference": {
    en: "Receipt reference",
    kn: "ರಸೀದಿ / Receipt reference",
    hi: "रसीद संदर्भ",
  },
  "ಜಾಹೀರಾತಿನ ಸಂದೇಶ (160)": {
    en: "Ad message (160)",
    kn: "ಜಾಹೀರಾತಿನ ಸಂದೇಶ (160)",
    hi: "विज्ञापन संदेश (160)",
  },
  "ಫೋನ್ / Phone": { en: "Phone", kn: "ಫೋನ್ / Phone", hi: "फ़ोन" },
  "ವಿಳಾಸ / ಊರು": { en: "Address / town", kn: "ವಿಳಾಸ / ಊರು", hi: "पता / शहर" },
  "ಅರ್ಜಿದಾರರು / Applicant": {
    en: "Applicant",
    kn: "ಅರ್ಜಿದಾರರು / Applicant",
    hi: "आवेदक",
  },
  "ಪರಿಶೀಲನಾ ಟಿಪ್ಪಣಿ / Review note": {
    en: "Review note",
    kn: "ಪರಿಶೀಲನಾ ಟಿಪ್ಪಣಿ / Review note",
    hi: "समीक्षा टिप्पणी",
  },
  "ರಾಜ್ಯ / State": { en: "State", kn: "ರಾಜ್ಯ / State", hi: "राज्य" },
  "Website (https://)": {
    en: "Website (https://)",
    kn: "ವೆಬ್‌ಸೈಟ್ (https://)",
    hi: "वेबसाइट (https://)",
  },
  "Applicant phone": {
    en: "Applicant phone",
    kn: "ಅರ್ಜಿದಾರರ ಫೋನ್",
    hi: "आवेदक का फ़ोन",
  },
  "Requested formats": {
    en: "Requested formats",
    kn: "ಕೋರಿದ ಸ್ವರೂಪಗಳು",
    hi: "अनुरोधित प्रारूप",
  },
};
const languageNames: Record<string, Tri> = {
  English: { en: "English", kn: "ಇಂಗ್ಲಿಷ್", hi: "अंग्रेज़ी" },
  Hindi: { en: "Hindi", kn: "ಹಿಂದಿ", hi: "हिंदी" },
};
const translatedFields: Record<string, Tri> = {
  title: { en: "title", kn: "ಶೀರ್ಷಿಕೆ", hi: "शीर्षक" },
  alt: { en: "alt text", kn: "ಪರ್ಯಾಯ ಪಠ್ಯ", hi: "वैकल्पिक पाठ" },
  name: { en: "name", kn: "ಹೆಸರು", hi: "नाम" },
  offer: { en: "offer", kn: "ಜಾಹೀರಾತಿನ ಸಂದೇಶ", hi: "विज्ञापन संदेश" },
  description: { en: "description", kn: "ವಿವರಣೆ", hi: "विवरण" },
  role: { en: "role", kn: "ಹುದ್ದೆ", hi: "भूमिका" },
  bio: { en: "bio", kn: "ಪರಿಚಯ", hi: "परिचय" },
  credentials: { en: "credentials", kn: "ಅರ್ಹತೆಗಳು", hi: "योग्यताएँ" },
  intro: { en: "intro", kn: "ಪೀಠಿಕೆ", hi: "प्रस्तावना" },
  label: { en: "label", kn: "ಲೇಬಲ್", hi: "लेबल" },
  deity: { en: "deity", kn: "ದೇವರು", hi: "देवता" },
  history: { en: "history", kn: "ಇತಿಹಾಸ", hi: "इतिहास" },
  timings: { en: "timings", kn: "ಸಮಯ", hi: "समय" },
  body: { en: "body", kn: "ಮುಖ್ಯ ಪಠ್ಯ", hi: "मुख्य पाठ" },
  summary: { en: "summary", kn: "ಸಾರಾಂಶ", hi: "सारांश" },
};
const labelSuffixes: [string, Tri][] = [
  [" (English)", { en: " (English)", kn: " (English)", hi: " (अंग्रेज़ी)" }],
  [" (हिंदी)", { en: " (Hindi)", kn: " (हिंदी)", hi: " (हिंदी)" }],
  [
    " (ಖಾಲಿ = ಎಲ್ಲೆಡೆ)",
    {
      en: " (empty = everywhere)",
      kn: " (ಖಾಲಿ = ಎಲ್ಲೆಡೆ)",
      hi: " (खाली = हर जगह)",
    },
  ],
];
/** Renders a module-level schema label, which is Kannada or English source text. */
export function fieldLabel(
  text: string,
  tr: (text: Tri) => string,
  l: (text: string) => string,
): string {
  if (fixedLabels[text]) return tr(fixedLabels[text]);
  const translated = /^(English|Hindi)(?: (\w+))?$/.exec(text);
  if (translated && (!translated[2] || translatedFields[translated[2]]))
    return (
      tr(languageNames[translated[1]]) +
      (translated[2] ? " " + tr(translatedFields[translated[2]]) : "")
    );
  for (const [suffix, label] of labelSuffixes)
    if (text.endsWith(suffix))
      return fieldLabel(text.slice(0, -suffix.length), tr, l) + tr(label);
  return l(text);
}
export function ResourceEditor({
  resource,
  rows,
  choices,
  relationships,
}: {
  resource: V4Resource;
  rows: Record<string, unknown>[];
  choices: Record<string, Choice[]>;
  relationships: { parent: string; post: string; order: number }[];
}) {
  const { kn, v4: t, tr, l } = useUiStrings();
  const label = (text: string) => fieldLabel(text, tr, l);
  const [selected, setSelected] = useState<Record<string, unknown>>({}),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const router = useRouter(),
    config = v4Resources[resource];
  return (
    <>
      <div className="resource-list">
        <button
          className="button button-ember"
          onClick={() => {
            setSelected({});
            setMessage("");
          }}
        >
          {t.newItem}
        </button>
        {rows.map((row) => (
          <button
            className="chip"
            key={String(row.id)}
            onClick={() => {
              setSelected(row);
              setMessage("");
            }}
          >
            {String(
              row.advertiser ||
                row.title_kn ||
                row.label_kn ||
                row.name_kn ||
                row.question_kn ||
                row.slug ||
                row.id,
            )}
          </button>
        ))}
      </div>
      <form
        key={String(selected.id || "new")}
        className="form-grid"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setMessage("");
          try {
            const values: Record<string, unknown> = Object.fromEntries(
              new FormData(event.currentTarget),
            );
            for (const field of config.fields) {
              if (field.type === "checkbox")
                values[field.name] = new FormData(event.currentTarget).has(
                  field.name,
                );
              if (field.type === "list")
                values[field.name] = JSON.stringify(
                  String(values[field.name] || "")
                    .split("\n")
                    .map((line) => line.trim())
                    .filter(Boolean),
                );
            }
            const result = await saveV4(
              resource,
              selected.id ? String(selected.id) : null,
              values,
            );
            setMessage(result.error ? l(result.error) : t.saved);
            if (!result.error) {
              router.refresh();
            }
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {config.fields.map((field) => {
          const value = selected[field.name],
            catalog =
              field.name === "campaign_id"
                ? choices.ad_campaigns
                : field.name === "category_ids"
                  ? choices.categories
                  : field.name === "target_places"
                    ? choices.places
                    : field.name === "place_id" || field.name === "district_id"
                      ? choices.places
                      : field.name === "liveblog_post_id"
                        ? choices.liveblogs
                        : field.name === "tag_ids"
                          ? choices.tags
                          : field.name === "event_ids"
                            ? choices.events
                            : undefined;
          if (
            [
              "image_url",
              "mobile_image_url",
              "photo_url",
              "cover_url",
              "avatar_url",
            ].includes(field.name)
          )
            return (
              <ImageField
                key={field.name}
                name={field.name}
                label={label(field.label)}
                initial={String(value || "")}
              />
            );
          if (field.type === "structured")
            return (
              <fieldset className="field wide" key={field.name}>
                <legend>{label(field.label)}</legend>
                <StructuredEditor name={field.name} initial={value} />
              </fieldset>
            );
          if (field.name === "place_id" || field.name === "district_id")
            return (
              <PlacePicker
                key={field.name}
                name={field.name}
                label={label(field.label)}
                places={(choices.places || []).map((choice) => ({
                  ...choice,
                  name_kn: choice.name_kn || choice.label,
                }))}
                defaultValue={String(value ?? "")}
              />
            );
          if (field.type === "ids")
            return (
              <MultiSelect
                key={field.name}
                name={field.name}
                label={label(field.label)}
                choices={catalog || []}
                initial={Array.isArray(value) ? value.map(String) : []}
              />
            );
          return (
            <label
              className={
                "field " +
                (["textarea", "list"].includes(field.type) ? "wide" : "")
              }
              key={field.name}
            >
              {label(field.label)}
              {field.type === "checkbox" ? (
                <input
                  type="checkbox"
                  name={field.name}
                  defaultChecked={
                    value === undefined
                      ? field.name === "show_in_district_news"
                      : Boolean(value)
                  }
                />
              ) : field.type === "select" || catalog ? (
                <select name={field.name} defaultValue={String(value ?? "")}>
                  <option value="">{t.select}</option>
                  {(
                    catalog ||
                    field.options?.map((option) => ({
                      id: option,
                      label: choiceLabels[option]
                        ? tr(choiceLabels[option])
                        : option,
                    })) ||
                    []
                  ).map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : ["textarea", "list"].includes(field.type) ? (
                <textarea
                  name={field.name}
                  rows={4}
                  defaultValue={
                    Array.isArray(value)
                      ? value.join("\n")
                      : String(value || "")
                  }
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  step={field.type === "number" ? "any" : undefined}
                  defaultValue={
                    field.type === "datetime-local" && value
                      ? new Date(String(value))
                          .toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" })
                          .replace(" ", "T")
                          .slice(0, 16)
                      : String(
                          value ??
                            (field.name === "cover_url"
                              ? "/images/jwalamala-logo.jpg"
                              : field.type === "number" &&
                                  ![
                                    "lat",
                                    "lng",
                                    "max_impressions",
                                    "max_clicks",
                                    "daily_impression_cap",
                                    "amount",
                                  ].includes(field.name)
                                ? field.name === "weight"
                                  ? 1
                                  : 0
                                : ""),
                        )
                  }
                />
              )}
            </label>
          );
        })}
        <div className="field wide">
          <button className="button button-ember" disabled={busy}>
            {busy ? t.loading : kn.save}
          </button>
          {resource === "places" && !!selected.id && (
            <button
              type="button"
              className="button button-outline"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm(t.confirmDelete)) return;
                setBusy(true);
                setMessage("");
                try {
                  const result = await deleteV4(resource, String(selected.id));
                  setMessage(result.error ? l(result.error) : t.deleted);
                  if (!result.error) {
                    setSelected({});
                    router.refresh();
                  }
                } catch {
                  setMessage(t.failed);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t.delete}
            </button>
          )}
          <p role="status">{message}</p>
        </div>
      </form>
      {resource === "places" && (
        <DistrictOrder
          key={rows.map((row) => String(row.id)).join()}
          districts={rows.filter((row) => row.is_district)}
        />
      )}
      {selected.id && (resource === "topics" || resource === "series") && (
        <RelationshipEditor
          key={String(selected.id)}
          resource={resource}
          parentId={String(selected.id)}
          posts={choices.posts || []}
          initial={relationships
            .filter((row) => row.parent === selected.id)
            .sort((a, b) => a.order - b.order)
            .map((row) => row.post)}
        />
      )}
      {selected.id && resource === "tags" && (
        <form
          className="public-filter"
          onSubmit={async (event) => {
            event.preventDefault();
            const target = String(
              new FormData(event.currentTarget).get("target") || "",
            );
            const result = await mergeTags(String(selected.id), target);
            setMessage(result.error || t.saved);
            router.refresh();
          }}
        >
          <label className="field">
            {t.merge}
            <select name="target" required>
              <option value="">{t.select}</option>
              {rows
                .filter((row) => row.id !== selected.id)
                .map((row) => (
                  <option value={String(row.id)} key={String(row.id)}>
                    {String(row.name_kn)}
                  </option>
                ))}
            </select>
          </label>
          <button className="button button-outline">{t.merge}</button>
        </form>
      )}
    </>
  );
}
function MultiSelect({
  name,
  label,
  choices,
  initial,
}: {
  name: string;
  label: string;
  choices: Choice[];
  initial: string[];
}) {
  const [selected, setSelected] = useState(initial);
  return (
    <fieldset className="field wide">
      <legend>{label}</legend>
      <input type="hidden" name={name} value={JSON.stringify(selected)} />
      <div className="category-chips">
        {choices.map((choice) => (
          <button
            type="button"
            className={"chip " + (selected.includes(choice.id) ? "active" : "")}
            aria-pressed={selected.includes(choice.id)}
            key={choice.id}
            onClick={() =>
              setSelected(
                selected.includes(choice.id)
                  ? selected.filter((id) => id !== choice.id)
                  : [...selected, choice.id],
              )
            }
          >
            {choice.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
function RelationshipEditor({
  resource,
  parentId,
  posts,
  initial,
}: {
  resource: "topics" | "series";
  parentId: string;
  posts: Choice[];
  initial: string[];
}) {
  const { kn, v4: t } = useUiStrings();
  const [ids, setIds] = useState(initial),
    [message, setMessage] = useState("");
  function move(index: number, delta: number) {
    const next = [...ids];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setIds(next);
  }
  return (
    <section className="utility-panel">
      <h2>{resource === "topics" ? t.pinned : t.episodes}</h2>
      {ids.map((id, i) => (
        <div className="ordered-row" key={id}>
          <span>
            {i + 1}. {posts.find((post) => post.id === id)?.label || id}
          </span>
          <button
            className="chip"
            disabled={i === 0}
            onClick={() => move(i, -1)}
          >
            {t.up}
          </button>
          <button
            className="chip"
            disabled={i === ids.length - 1}
            onClick={() => move(i, 1)}
          >
            {t.down}
          </button>
          <button
            className="chip"
            onClick={() => setIds(ids.filter((value) => value !== id))}
          >
            {t.remove}
          </button>
        </div>
      ))}
      <select
        aria-label={t.addRow}
        value=""
        onChange={(event) => setIds([...ids, event.target.value])}
      >
        <option value="">{t.addRow}</option>
        {posts
          .filter((post) => !ids.includes(post.id))
          .map((post) => (
            <option value={post.id} key={post.id}>
              {post.label}
            </option>
          ))}
      </select>
      <button
        className="button button-ember"
        onClick={async () => {
          const result = await saveRelationships(resource, parentId, ids);
          setMessage(result.error || t.saved);
        }}
      >
        {kn.save}
      </button>
      <p role="status">{message}</p>
    </section>
  );
}

function DistrictOrder({
  districts,
}: {
  districts: Record<string, unknown>[];
}) {
  const { kn, v4: t } = useUiStrings();
  const router = useRouter();
  const [ids, setIds] = useState(() => districts.map((row) => String(row.id))),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const byId = new Map(districts.map((row) => [String(row.id), row]));
  function move(index: number, to: number) {
    const next = [...ids];
    const [id] = next.splice(index, 1);
    next.splice(to, 0, id);
    setIds(next);
    setMessage("");
  }
  if (!ids.length) return null;
  return (
    <section className="utility-panel">
      <h2>{t.districtOrder}</h2>
      <p className="meta">{t.districtOrderHelp}</p>
      {ids.map((id, i) => {
        const row = byId.get(id);
        return (
          <div className="ordered-row" key={id}>
            <span>
              {i + 1}. {String(row?.name_kn || id)}
              {row?.show_in_district_news === false && (
                <> ({t.hiddenDistrict})</>
              )}
            </span>
            <button
              type="button"
              className="chip"
              disabled={i === 0}
              onClick={() => move(i, 0)}
            >
              {t.moveFirst}
            </button>
            <button
              type="button"
              className="chip"
              disabled={i === 0}
              onClick={() => move(i, i - 1)}
            >
              {t.up}
            </button>
            <button
              type="button"
              className="chip"
              disabled={i === ids.length - 1}
              onClick={() => move(i, i + 1)}
            >
              {t.down}
            </button>
            <button
              type="button"
              className="chip"
              disabled={i === ids.length - 1}
              onClick={() => move(i, ids.length - 1)}
            >
              {t.moveLast}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        className="button button-ember"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const result = await saveDistrictOrder(ids);
            setMessage(result.error || t.saved);
            if (!result.error) router.refresh();
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? t.loading : kn.save}
      </button>
      <p role="status">{message}</p>
    </section>
  );
}

function ImageField({
  name,
  label,
  initial,
}: {
  name: string;
  label: string;
  initial: string;
}) {
  const { tr } = useUiStrings();
  const [url, setUrl] = useState(initial);
  const valid = isHostedImage(url.trim());
  return (
    <fieldset className="field wide">
      <legend>{label}</legend>
      <div className="image-link-field">
        <label className="field">
          {tr({ en: "Image link", kn: "ಚಿತ್ರದ ಲಿಂಕ್", hi: "चित्र लिंक" })}
          <input
            name={name}
            value={url}
            placeholder="https://ik.imagekit.io/your-id/photo.jpg"
            onChange={(e) => setUrl(e.target.value)}
          />
          <small>
            {tr({
              en: "Paste an ImageKit link or an /images/ path. Images are not uploaded to our server.",
              kn: "ImageKit ಲಿಂಕ್ ಅಥವಾ /images/ ವಿಳಾಸ ಅಂಟಿಸಿ. ಚಿತ್ರಗಳನ್ನು ನಮ್ಮ ಸರ್ವರ್‌ಗೆ ಅಪ್‌ಲೋಡ್ ಮಾಡುವುದಿಲ್ಲ.",
              hi: "ImageKit लिंक या /images/ पथ चिपकाएँ। चित्र हमारे सर्वर पर अपलोड नहीं होते।",
            })}
          </small>
        </label>
        {valid && (
          // eslint-disable-next-line @next/next/no-img-element -- admin-only preview of the pasted link
          <img src={url.trim()} alt="" className="image-link-preview" />
        )}
      </div>
    </fieldset>
  );
}
