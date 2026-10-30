"use client";
import { useState } from "react";
import type { JainRules } from "@/lib/jain/times";
import { saveJainTimes } from "@/app/admin/jain-times/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function JainRulesEditor({ initial }: { initial: JainRules }) {
  const { tr } = useUiStrings();
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
          setMessage(
            r.error || tr({ en: "Saved", kn: "ಉಳಿಸಲಾಗಿದೆ", hi: "सहेजा गया" }),
          );
        } catch {
          setMessage(
            tr({
              en: "Save failed",
              kn: "ಉಳಿಸಲಾಗಲಿಲ್ಲ",
              hi: "सहेजना विफल रहा",
            }),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>
        {tr({
          en: "Jain daily timing rules",
          kn: "ಜೈನ ದಿನದ ಸಮಯದ ನಿಯಮಗಳು",
          hi: "जैन दैनिक समय के नियम",
        })}
      </h1>
      <p>
        {tr({
          en: "Only advisor-approved rules appear publicly. Changing a rule clears approval. Offsets are minutes; daylight fractions range from 0 to 1.",
          kn: "ಸಲಹೆಗಾರರು ಅನುಮೋದಿಸಿದ ನಿಯಮಗಳು ಮಾತ್ರ ಸಾರ್ವಜನಿಕವಾಗಿ ಕಾಣಿಸುತ್ತವೆ. ನಿಯಮ ಬದಲಿಸಿದರೆ ಅನುಮೋದನೆ ರದ್ದಾಗುತ್ತದೆ. ಅಂತರಗಳು ನಿಮಿಷಗಳಲ್ಲಿ; ಹಗಲಿನ ಭಾಗ 0 ರಿಂದ 1 ರವರೆಗೆ.",
          hi: "केवल सलाहकार द्वारा स्वीकृत नियम ही सार्वजनिक रूप से दिखते हैं। नियम बदलने पर स्वीकृति हट जाती है। अंतर मिनटों में हैं; दिन के उजाले का भाग 0 से 1 तक होता है।",
        })}
      </p>
      {value.rules.map((r, i) => (
        <fieldset key={i} className="utility-panel">
          <label className="field">
            {tr({ en: "Kannada name", kn: "ಕನ್ನಡ ಹೆಸರು", hi: "कन्नड़ नाम" })}
            <input
              value={r.name_kn}
              required
              onChange={(e) => update(i, { name_kn: e.target.value })}
            />
          </label>
          <label className="field">
            {tr({ en: "Base", kn: "ಆಧಾರ", hi: "आधार" })}
            <select
              value={r.base}
              onChange={(e) =>
                update(i, { base: e.target.value as typeof r.base })
              }
            >
              <option value="sunrise">
                {tr({ en: "Sunrise", kn: "ಸೂರ್ಯೋದಯ", hi: "सूर्योदय" })}
              </option>
              <option value="sunset">
                {tr({ en: "Sunset", kn: "ಸೂರ್ಯಾಸ್ತ", hi: "सूर्यास्त" })}
              </option>
              <option value="daylight">
                {tr({
                  en: "Fraction of daylight after sunrise",
                  kn: "ಸೂರ್ಯೋದಯದ ನಂತರದ ಹಗಲಿನ ಭಾಗ",
                  hi: "सूर्योदय के बाद दिन के उजाले का भाग",
                })}
              </option>
            </select>
          </label>
          <label className="field">
            {tr({
              en: "Offset minutes",
              kn: "ಅಂತರ ನಿಮಿಷಗಳು",
              hi: "अंतर (मिनट)",
            })}
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
              {tr({
                en: "Daylight fraction",
                kn: "ಹಗಲಿನ ಭಾಗ",
                hi: "दिन के उजाले का भाग",
              })}
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
            {tr({ en: "Visible", kn: "ಕಾಣಿಸಲಿ", hi: "दृश्यमान" })}
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
            {tr({
              en: "Remove rule",
              kn: "ನಿಯಮ ತೆಗೆದುಹಾಕಿ",
              hi: "नियम हटाएँ",
            })}
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
        {tr({ en: "Add rule", kn: "ನಿಯಮ ಸೇರಿಸಿ", hi: "नियम जोड़ें" })}
      </button>
      <label className="field">
        {tr({
          en: "Approving community advisor",
          kn: "ಅನುಮೋದಿಸುವ ಸಮುದಾಯ ಸಲಹೆಗಾರ",
          hi: "स्वीकृति देने वाले सामुदायिक सलाहकार",
        })}
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
        {tr({
          en: "These exact rules have been approved by the named advisor",
          kn: "ಹೆಸರಿಸಿದ ಸಲಹೆಗಾರರು ಇದೇ ನಿಯಮಗಳನ್ನು ಅನುಮೋದಿಸಿದ್ದಾರೆ",
          hi: "नामित सलाहकार ने ठीक इन्हीं नियमों को स्वीकृत किया है",
        })}
      </label>
      <button className="button button-ember" disabled={busy}>
        {tr({ en: "Save rules", kn: "ನಿಯಮಗಳನ್ನು ಉಳಿಸಿ", hi: "नियम सहेजें" })}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
