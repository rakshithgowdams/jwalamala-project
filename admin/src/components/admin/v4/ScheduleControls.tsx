"use client";
import { useState } from "react";
import { saveSchedule } from "@/app/admin/distribution-schedule/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function ScheduleControls({
  initial,
}: {
  initial: { enabled: boolean; hours: number[]; networks: string[] };
}) {
  const { tr } = useUiStrings();
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
          setMessage(
            r.error ||
              tr({
                en: "Schedule saved.",
                kn: "ವೇಳಾಪಟ್ಟಿ ಉಳಿಸಲಾಗಿದೆ.",
                hi: "समय-सारणी सहेजी गई।",
              }),
          );
        } catch {
          setMessage(
            tr({
              en: "Could not save schedule.",
              kn: "ವೇಳಾಪಟ್ಟಿ ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
              hi: "समय-सारणी सहेजी नहीं जा सकी।",
            }),
          );
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
        {tr({
          en: "Enable scheduled drafts",
          kn: "ನಿಗದಿತ ಕರಡುಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
          hi: "निर्धारित ड्राफ़्ट चालू करें",
        })}
      </label>
      <label className="field wide">
        {tr({
          en: "Hours in India time, separated by commas",
          kn: "ಭಾರತೀಯ ಸಮಯದ ಗಂಟೆಗಳು, ಅಲ್ಪವಿರಾಮದಿಂದ ಬೇರ್ಪಡಿಸಿ",
          hi: "भारतीय समय के घंटे, अल्पविराम से अलग करें",
        })}
        <input name="hours" defaultValue={initial.hours.join(",")} required />
      </label>
      <fieldset className="wide">
        <legend>
          {tr({
            en: "Draft destinations",
            kn: "ಕರಡು ಕಳುಹಿಸುವ ತಾಣಗಳು",
            hi: "ड्राफ़्ट के गंतव्य",
          })}
        </legend>
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
        {tr({
          en: "Save schedule",
          kn: "ವೇಳಾಪಟ್ಟಿ ಉಳಿಸಿ",
          hi: "समय-सारणी सहेजें",
        })}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
