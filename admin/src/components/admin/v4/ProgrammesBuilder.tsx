"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveProgrammesHub } from "@/app/admin/programmes/actions";
import {
  defaultProgrammeCards,
  type ProgrammesHubConfig,
} from "@/lib/v4/programmes";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

export function ProgrammesBuilder({
  initial,
}: {
  initial: ProgrammesHubConfig;
}) {
  const { tr } = useUiStrings();
  const [config, setConfig] = useState(
    initial.cards.length ? initial : { cards: defaultProgrammeCards },
  );
  const [message, setMessage] = useState("");
  const [busy, start] = useTransition();

  function move(index: number, delta: number) {
    setConfig((c) => {
      const cards = [...c.cards];
      const next = index + delta;
      if (next < 0 || next >= cards.length) return c;
      [cards[index], cards[next]] = [cards[next], cards[index]];
      return { ...c, cards };
    });
  }

  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const result = await saveProgrammesHub(config);
          setMessage(
            result.error ||
              tr({
                en: "Programmes hub saved.",
                kn: "ಕಾರ್ಯಕ್ರಮ ಕೇಂದ್ರ ಉಳಿಸಲಾಗಿದೆ.",
                hi: "कार्यक्रम केंद्र सहेजा गया।",
              }),
          );
        });
      }}
    >
      <p className="wide">
        {tr({
          en: "Reorder the cards shown when readers open Jwalamala News programmes. Enable Social media videos so channel clips stay easy to find.",
          kn: "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ತೆರೆದಾಗ ಕಾಣುವ ಕಾರ್ಡ್‌ಗಳನ್ನು ವಿಂಗಡಿಸಿ. ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ವಿಡಿಯೋಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ.",
          hi: "ज्वालामाल न्यूज़ कार्यक्रम खोलने पर दिखने वाले कार्ड क्रमबद्ध करें। सोशल मीडिया वीडियो विकल्प चालू रखें।",
        })}
      </p>
      <fieldset className="wide">
        <legend>
          {tr({
            en: "Programme and social cards",
            kn: "ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಸಾಮಾಜಿಕ ಕಾರ್ಡ್‌ಗಳು",
            hi: "कार्यक्रम और सोशल कार्ड",
          })}
        </legend>
        {config.cards.map((card, index) => (
          <div className="poll-option" key={card.id}>
            <label>
              <input
                type="checkbox"
                checked={card.enabled}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    cards: c.cards.map((row, i) =>
                      i === index ? { ...row, enabled: e.target.checked } : row,
                    ),
                  }))
                }
              />
              <span>
                {card.label_kn}
                <small style={{ display: "block", opacity: 0.75 }}>
                  {card.kind === "social"
                    ? tr({
                        en: "Social / video",
                        kn: "ಸಾಮಾಜಿಕ / ವಿಡಿಯೋ",
                        hi: "सोशल / वीडियो",
                      })
                    : tr({
                        en: "Programme show",
                        kn: "ವಾಹಿನಿ ಕಾರ್ಯಕ್ರಮ",
                        hi: "चैनल कार्यक्रम",
                      })}{" "}
                  · {card.href}
                </small>
              </span>
            </label>
            <span style={{ display: "inline-flex", gap: 8 }}>
              <button
                type="button"
                className="button"
                disabled={index === 0 || busy}
                onClick={() => move(index, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="button"
                disabled={index === config.cards.length - 1 || busy}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <Link className="button" href={card.href} target="_blank">
                {tr({ en: "Open", kn: "ತೆರೆಯಿರಿ", hi: "खोलें" })}
              </Link>
            </span>
          </div>
        ))}
      </fieldset>
      <div className="wide" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button className="button button-ember" disabled={busy} type="submit">
          {busy
            ? tr({ en: "Saving…", kn: "ಉಳಿಸಲಾಗುತ್ತಿದೆ…", hi: "सहेजा जा रहा है…" })
            : tr({ en: "Save hub", kn: "ಕೇಂದ್ರ ಉಳಿಸಿ", hi: "केंद्र सहेजें" })}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => setConfig({ cards: defaultProgrammeCards })}
        >
          {tr({
            en: "Reset defaults",
            kn: "ಪೂರ್ವನಿಯೋಜಿತಕ್ಕೆ ಮರಳಿ",
            hi: "डिफ़ॉल्ट पर लौटें",
          })}
        </button>
      </div>
      {message ? <p className="wide">{message}</p> : null}
    </form>
  );
}
