"use client";
import { useState } from "react";
import { saveSchedule } from "@/app/admin/distribution-schedule/actions";
export function ScheduleControls({
  initial,
}: {
  initial: { enabled: boolean; hours: number[]; networks: string[] };
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        try {
          const r = await saveSchedule({
            enabled: f.has("enabled"),
            hours: f.get("hours"),
            networks: f.getAll("networks"),
          });
          setMessage(r.error || "Schedule saved.");
        } catch {
          setMessage("Could not save schedule.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="poll-option">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={initial.enabled}
        />
        Enable scheduled drafts
      </label>
      <label className="field wide">
        Hours in India time, separated by commas
        <input name="hours" defaultValue={initial.hours.join(",")} required />
      </label>
      <fieldset className="wide">
        <legend>Draft destinations</legend>
        {["newsletter", "telegram", "facebook"].map((n) => (
          <label className="poll-option" key={n}>
            <input
              type="checkbox"
              name="networks"
              value={n}
              defaultChecked={initial.networks.includes(n)}
            />
            {n}
          </label>
        ))}
      </fieldset>
      <button className="button button-ember" disabled={busy}>
        Save schedule
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
