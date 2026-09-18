"use client";
import { useState } from "react";
import { saveProvider, saveRolePermission } from "@/app/admin/controls/actions";
import { providerIds, roles, permissions } from "@/lib/v4/control-schema";
import { v4 as t, kn } from "@/content/strings.kn";
export function ProviderControls({
  rows,
  usage,
  configured,
  categories,
}: {
  rows: Record<string, unknown>[];
  usage: Record<string, unknown>[];
  configured: Record<string, boolean>;
  categories: { id: string; name_kn: string }[];
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <p className="notice">{t.budgetNote}</p>
      <div className="community-grid">
        {providerIds.map((id) => {
          const row = rows.find((r) => r.id === id),
            used = usage
              .filter((u) => u.provider_id === id)
              .reduce((n, u) => n + Number(u.used), 0);
          return (
            <form
              className="utility-panel"
              key={id}
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                try {
                  const result = await saveProvider({
                    id,
                    enabled: f.has("enabled"),
                    monthly_limit: f.get("monthly_limit"),
                    blocked_category_ids: f.getAll("blocked"),
                  });
                  setMessage(result.error || t.saved);
                } catch {
                  setMessage(t.failed);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>{id}</h2>
              <p>
                {configured[id] ? t.credentialsReady : t.credentialsMissing}
              </p>
              <p>
                {t.usage}: {used.toLocaleString()} {String(row?.unit || "")}
              </p>
              <label className="field">
                {t.monthlyLimit}
                <input
                  name="monthly_limit"
                  type="number"
                  min={0}
                  max={1e9}
                  defaultValue={Number(row?.monthly_limit || 0)}
                />
              </label>
              <label className="poll-option">
                <input
                  name="enabled"
                  type="checkbox"
                  defaultChecked={Boolean(row?.enabled)}
                />
                {t.enabled}
              </label>
              {id === "ai" && (
                <fieldset>
                  <legend>{t.aiBlockedCategories}</legend>
                  {categories.map((c) => (
                    <label className="poll-option" key={c.id}>
                      <input
                        type="checkbox"
                        name="blocked"
                        value={c.id}
                        defaultChecked={
                          !!(
                            row?.options as { blocked_category_ids?: string[] }
                          )?.blocked_category_ids?.includes(c.id)
                        }
                      />
                      {c.name_kn}
                    </label>
                  ))}
                </fieldset>
              )}
              <button disabled={busy} className="button button-ember">
                {kn.save}
              </button>
            </form>
          );
        })}
      </div>
      <p role="status">{message}</p>
    </>
  );
}
export function RoleMatrix({
  rows,
}: {
  rows: { role: string; permission: string; allowed: boolean }[];
}) {
  const [values, setValues] = useState(rows),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>{t.role}</th>
              {permissions.map((p) => (
                <th key={p}>{p}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role}>
                <th>{role}</th>
                {permissions.map((permission) => {
                  const allowed =
                    values.find(
                      (v) => v.role === role && v.permission === permission,
                    )?.allowed || false;
                  return (
                    <td key={permission}>
                      <input
                        type="checkbox"
                        aria-label={role + " " + permission}
                        checked={allowed}
                        disabled={busy}
                        onChange={async (e) => {
                          const next = {
                            role,
                            permission,
                            allowed: e.target.checked,
                          };
                          setBusy(true);
                          try {
                            const result = await saveRolePermission(next);
                            if (result.error) setMessage(result.error);
                            else {
                              setValues([
                                ...values.filter(
                                  (v) =>
                                    v.role !== role ||
                                    v.permission !== permission,
                                ),
                                next,
                              ]);
                              setMessage(t.saved);
                            }
                          } catch {
                            setMessage(t.failed);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p role="status">{message}</p>
    </>
  );
}
