"use client";
import { useState } from "react";
import type { JainRules } from "@/lib/jain/times";
import { saveJainTimes } from "@/app/admin/jain-times/actions";
export function JainRulesEditor({ initial }: { initial: JainRules }) {
  const [value, setValue] = useState(initial),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  function update(i: number, change: Partial<JainRules["rules"][number]>) {
    setValue((v) => ({
      ...v,
      approved: false,
      rules: v.rules.map((r, n) => (n === i ? { ...r, ...change } : r)),
    }));
  }
  return (
    <form
      className="v4-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await saveJainTimes(value);
          setMessage(r.error || "Saved");
        } catch {
          setMessage("Save failed");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>ಜೈನ ದಿನದ ಸಮಯದ ನಿಯಮಗಳು</h1>
      <p>
        Only advisor-approved rules appear publicly. Changing a rule clears
        approval. Offsets are minutes; daylight fractions range from 0 to 1.
      </p>
      {value.rules.map((r, i) => (
        <fieldset key={i} className="utility-panel">
          <label className="field">
            Kannada name
            <input
              value={r.name_kn}
              required
              onChange={(e) => update(i, { name_kn: e.target.value })}
            />
          </label>
          <label className="field">
            Base
            <select
              value={r.base}
              onChange={(e) =>
                update(i, { base: e.target.value as typeof r.base })
              }
            >
              <option value="sunrise">Sunrise</option>
              <option value="sunset">Sunset</option>
              <option value="daylight">
                Fraction of daylight after sunrise
              </option>
            </select>
          </label>
          <label className="field">
            Offset minutes
            <input
              type="number"
              min={-240}
              max={240}
              value={r.offset}
              onChange={(e) => update(i, { offset: Number(e.target.value) })}
            />
          </label>
          {r.base === "daylight" && (
            <label className="field">
              Daylight fraction
              <input
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={r.fraction ?? 0}
                onChange={(e) =>
                  update(i, { fraction: Number(e.target.value) })
                }
              />
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={r.visible}
              onChange={(e) => update(i, { visible: e.target.checked })}
            />{" "}
            Visible
          </label>
          <button
            type="button"
            className="chip"
            onClick={() =>
              setValue((v) => ({
                ...v,
                approved: false,
                rules: v.rules.filter((_, n) => n !== i),
              }))
            }
          >
            Remove rule
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        className="button"
        disabled={value.rules.length >= 20}
        onClick={() =>
          setValue((v) => ({
            ...v,
            approved: false,
            rules: [
              ...v.rules,
              { name_kn: "", base: "sunset", offset: 0, visible: true },
            ],
          }))
        }
      >
        Add rule
      </button>
      <label className="field">
        Approving community advisor
        <input
          value={value.approved_by}
          onChange={(e) =>
            setValue((v) => ({
              ...v,
              approved: false,
              approved_by: e.target.value,
            }))
          }
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={value.approved}
          onChange={(e) =>
            setValue((v) => ({ ...v, approved: e.target.checked }))
          }
        />{" "}
        These exact rules have been approved by the named advisor
      </label>
      <button className="button button-ember" disabled={busy}>
        Save rules
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
