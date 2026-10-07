"use client";
import { roles } from "@/lib/v4/control-schema";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { resources, type Resource } from "@/lib/admin/resources";
import { saveResource } from "@/app/admin/actions";
import { kn } from "@/content/strings.kn";
export function ResourceManager({
  resource,
  rows,
}: {
  resource: Resource;
  rows: Record<string, unknown>[];
}) {
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
            setMessage(result.error || kn.saved);
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
            {label}
            {resource === "users" && name === "role" ? (
              <select
                name="role"
                defaultValue={String(selected.role || "reader")}
              >
                {["admin", ...roles].map((role) => (
                  <option key={role}>{role}</option>
                ))}
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
