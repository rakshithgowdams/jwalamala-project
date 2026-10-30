"use client";
import { useState, useTransition } from "react";
import type { SupportConfig } from "@/lib/payments/schema";
import { saveSupport } from "@/app/admin/support/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function SupportSettings({ initial }: { initial: SupportConfig }) {
  const { tr } = useUiStrings();
  const [config, setConfig] = useState(initial),
    [message, setMessage] = useState(""),
    [busy, start] = useTransition();
  function tier(index: number, field: string, value: unknown) {
    setConfig((c) => ({
      ...c,
      tiers: c.tiers.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    }));
  }
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await saveSupport(config);
          setMessage(
            r.error || tr({ en: "Saved.", kn: "ಉಳಿಸಲಾಗಿದೆ.", hi: "सहेजा गया।" }),
          );
        });
      }}
    >
      <p className="notice wide">
        {tr({
          en: "Enable the service only after the receiving organisation, terms, refund policy and Razorpay account are ready. Amounts are in paise. No tax exemption is promised automatically.",
          kn: "ಪಾವತಿ ಸ್ವೀಕರಿಸುವ ಸಂಸ್ಥೆ, ನಿಯಮಗಳು, ಮರುಪಾವತಿ ನೀತಿ ಮತ್ತು Razorpay ಖಾತೆ ಸಿದ್ಧವಾದ ನಂತರ ಸೇವೆ ಸಕ್ರಿಯಗೊಳಿಸಿ. ಮೊತ್ತಗಳು ಪೈಸೆಗಳಲ್ಲಿ. ಯಾವುದೇ ತೆರಿಗೆ ವಿನಾಯಿತಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಭರವಸೆ ನೀಡಲಾಗುವುದಿಲ್ಲ.",
          hi: "भुगतान प्राप्त करने वाली संस्था, नियम, धनवापसी नीति और Razorpay खाता तैयार होने के बाद ही सेवा सक्रिय करें। राशियाँ पैसे में हैं। कोई कर छूट स्वतः वादा नहीं की जाती।",
        })}
      </p>
      <label className="chip">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
        />
        {tr({
          en: "Enable payments",
          kn: "ಪಾವತಿಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ",
          hi: "भुगतान सक्रिय करें",
        })}
      </label>
      {(["legal_name", "contact_email"] as const).map((key) => (
        <label className="field" key={key}>
          {key}
          <input
            value={config[key]}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          />
        </label>
      ))}
      {(["terms", "refund_policy"] as const).map((key) => (
        <label className="field wide" key={key}>
          {key}
          <textarea
            rows={5}
            value={config[key]}
            onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
          />
        </label>
      ))}
      {config.tiers.map((t, i) => (
        <fieldset className="form-grid wide" key={i}>
          <legend>
            {tr({ en: "Plan", kn: "ಯೋಜನೆ", hi: "योजना" })} {i + 1}
          </legend>
          {(["id", "name", "plan_id"] as const).map((key) => (
            <label className="field" key={key}>
              {key}
              <input
                value={t[key]}
                onChange={(e) => tier(i, key, e.target.value)}
              />
            </label>
          ))}
          <label className="field">
            {tr({
              en: "Amount (paise)",
              kn: "ಮೊತ್ತ (ಪೈಸೆ)",
              hi: "राशि (पैसे)",
            })}
            <input
              type="number"
              min="100"
              value={t.amount}
              onChange={(e) => tier(i, "amount", Number(e.target.value))}
            />
          </label>
          <label className="field">
            {tr({ en: "Period", kn: "ಅವಧಿ", hi: "अवधि" })}
            <select
              value={t.kind}
              onChange={(e) => tier(i, "kind", e.target.value)}
            >
              <option value="once">
                {tr({ en: "Once", kn: "ಒಮ್ಮೆ", hi: "एक बार" })}
              </option>
              <option value="monthly">
                {tr({ en: "Monthly", kn: "ತಿಂಗಳು", hi: "मासिक" })}
              </option>
              <option value="yearly">
                {tr({ en: "Yearly", kn: "ವರ್ಷ", hi: "वार्षिक" })}
              </option>
            </select>
          </label>
          <label className="field">
            {tr({
              en: "Maximum cycles",
              kn: "ಗರಿಷ್ಠ ಅವಧಿಗಳು",
              hi: "अधिकतम चक्र",
            })}
            <input
              type="number"
              min="1"
              max="120"
              value={t.cycles}
              onChange={(e) => tier(i, "cycles", Number(e.target.value))}
            />
          </label>
          <label className="field wide">
            {tr({
              en: "Benefits (one per line)",
              kn: "ಸೌಲಭ್ಯಗಳು (ಸಾಲಿಗೆ ಒಂದು)",
              hi: "लाभ (प्रति पंक्ति एक)",
            })}
            <textarea
              value={t.benefits.join("\n")}
              onChange={(e) => tier(i, "benefits", e.target.value.split("\n"))}
            />
          </label>
          <label className="chip">
            <input
              type="checkbox"
              checked={t.ad_light}
              onChange={(e) => tier(i, "ad_light", e.target.checked)}
            />
            {tr({
              en: "Fewer ads",
              kn: "ಕಡಿಮೆ ಜಾಹೀರಾತುಗಳು",
              hi: "कम विज्ञापन",
            })}
          </label>
          <button
            type="button"
            className="button"
            onClick={() =>
              setConfig({
                ...config,
                tiers: config.tiers.filter((_, n) => n !== i),
              })
            }
          >
            {tr({
              en: "Remove plan",
              kn: "ಯೋಜನೆ ತೆಗೆದುಹಾಕಿ",
              hi: "योजना हटाएँ",
            })}
          </button>
        </fieldset>
      ))}
      <button
        className="button"
        type="button"
        disabled={config.tiers.length >= 8}
        onClick={() =>
          setConfig({
            ...config,
            tiers: [
              ...config.tiers,
              {
                id: "",
                name: "",
                amount: 10000,
                kind: "once",
                plan_id: "",
                cycles: 12,
                benefits: [],
                ad_light: false,
              },
            ],
          })
        }
      >
        {tr({ en: "Add plan", kn: "ಯೋಜನೆ ಸೇರಿಸಿ", hi: "योजना जोड़ें" })}
      </button>
      <button className="button button-ember" disabled={busy}>
        {tr({ en: "Save", kn: "ಉಳಿಸಿ", hi: "सहेजें" })}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
