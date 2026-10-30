"use client";
import { roles } from "@/lib/v4/control-schema";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resources, type Resource } from "@/lib/admin/resources";
import { saveResource } from "@/app/admin/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { fieldLabel } from "@/components/admin/v4/ResourceEditor";
export function ResourceManager({
  resource,
  rows,
}: {
  resource: Resource;
  rows: Record<string, unknown>[];
}) {
  const { kn, tr, l } = useUiStrings();
  const [selected, setSelected] = useState<Record<string, unknown>>({}),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const router = useRouter();
  const config = resources[resource];
  return (
    <>
      <div className="resource-list">
        {rows.map((row, i) => (
          <button
            className="button button-outline"
            key={String(row.id || row.key || i)}
            onClick={() => {
              setSelected(row);
              setMessage("");
            }}
          >
            {String(
              row.name_kn ||
                row.full_name ||
                row.name ||
                row.advertiser ||
                row.key ||
                row.id,
            )}
          </button>
        ))}
      </div>
      <form
        key={String(selected.id || selected.key || "new")}
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const data = new FormData(e.currentTarget);
          const values: Record<string, unknown> = Object.fromEntries(data);
          for (const [name, , type] of config.fields)
            if (type === "checkbox") values[name] = data.has(name);
          try {
            const result = await saveResource(
              resource,
              selected.id
                ? String(selected.id)
                : selected.key
                  ? String(selected.key)
                  : null,
              values,
            );
            setMessage(result.error ? l(result.error) : kn.saved);
            setBusy(false);
            if (!result.error) router.refresh();
          } catch {
            setMessage(kn.unavailable);
          } finally {
            setBusy(false);
          }
        }}
      >
        {config.fields.map(([name, label, type]) => (
          <label
            className={"field " + (type === "textarea" ? "wide" : "")}
            key={name}
          >
            {fieldLabel(label, tr, l)}
            {resource === "users" && name === "role" ? (
              <select
                name="role"
                defaultValue={String(selected.role || "reader")}
              >
                {["admin", ...roles].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            ) : name === "parent_id" ? (
              <select
                name="parent_id"
                defaultValue={String(selected.parent_id || "")}
              >
                <option value="">—</option>
                {rows
                  .filter(
                    (row) => row.id && String(row.id) !== String(selected.id || ""),
                  )
                  .map((row) => (
                    <option key={String(row.id)} value={String(row.id)}>
                      {String(row.name_kn || row.slug || row.id)}
                    </option>
                  ))}
              </select>
            ) : name === "category_kind" ? (
              <select
                name="category_kind"
                defaultValue={String(selected.category_kind || "listing")}
              >
                <option value="news">news — ಸುದ್ದಿ (ಜಿಲ್ಲೆ, ಊರು, ದಿನಾಂಕ)</option>
                <option value="kshetra">kshetra — ಕ್ಷೇತ್ರ (ಜಿಲ್ಲೆ, ಊರು)</option>
                <option value="programme">programme — ವಾಹಿನಿ ಕಾರ್ಯಕ್ರಮ</option>
                <option value="upcoming">upcoming — ಮುಂಬರುವ</option>
                <option value="listing">listing — ಸಾಮಾನ್ಯ ಪಟ್ಟಿ</option>
              </select>
            ) : type === "textarea" ? (
              <textarea
                name={name}
                defaultValue={
                  typeof selected[name] === "object"
                    ? JSON.stringify(selected[name], null, 2)
                    : String(selected[name] || "")
                }
              />
            ) : type === "checkbox" ? (
              <input
                name={name}
                type="checkbox"
                defaultChecked={Boolean(selected[name])}
              />
            ) : (
              <input
                name={name}
                type={type}
                defaultValue={String(selected[name] ?? "")}
              />
            )}
          </label>
        ))}
        <div className="field wide">
          <button disabled={busy} className="button button-ember">
            {kn.save}
          </button>
          <p role="status">{message}</p>
        </div>
      </form>
    </>
  );
}
