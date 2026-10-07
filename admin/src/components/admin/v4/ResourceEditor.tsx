"use client";
import { ImageUpload } from "./ImageUpload";
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
import { kn, v4 as t, v4Choices } from "@/content/strings.kn";
export type Choice = { id: string; label: string };
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
            setMessage(result.error || t.saved);
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
                    : field.name === "place_id"
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
                label={field.label}
                initial={String(value || "")}
                ad={resource === "ads" || resource === "business_ads"}
              />
            );
          if (field.type === "structured")
            return (
              <fieldset className="field wide" key={field.name}>
                <legend>{field.label}</legend>
                <StructuredEditor name={field.name} initial={value} />
              </fieldset>
            );
          if (field.type === "ids")
            return (
              <MultiSelect
                key={field.name}
                name={field.name}
                label={field.label}
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
              {field.label}
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
                      label: v4Choices[option] || option,
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
                  setMessage(result.error || t.deleted);
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
  ad,
}: {
  name: string;
  label: string;
  initial: string;
  ad: boolean;
}) {
  const [url, setUrl] = useState(initial);
  return (
    <fieldset className="field wide">
      <legend>{label}</legend>
      <label className="field">
        Image URL
        <input
          name={name}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <ImageUpload kind={ad ? "ad" : "post"} onUploaded={setUrl} />
    </fieldset>
  );
}
