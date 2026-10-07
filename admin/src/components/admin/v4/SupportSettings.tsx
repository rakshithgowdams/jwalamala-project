"use client";
import { useState, useTransition } from "react";
import type { SupportConfig } from "@/lib/payments/schema";
import { saveSupport } from "@/app/admin/support/actions";
export function SupportSettings({ initial }: { initial: SupportConfig }) {
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
          setMessage(r.error || "ಉಳಿಸಲಾಗಿದೆ.");
        });
      }}
    >
      <p className="notice wide">
        ಪಾವತಿ ಸ್ವೀಕರಿಸುವ ಸಂಸ್ಥೆ, ನಿಯಮಗಳು, ಮರುಪಾವತಿ ನೀತಿ ಮತ್ತು Razorpay ಖಾತೆ
        ಸಿದ್ಧವಾದ ನಂತರ ಸೇವೆ ಸಕ್ರಿಯಗೊಳಿಸಿ. ಮೊತ್ತಗಳು ಪೈಸೆಗಳಲ್ಲಿ. ಯಾವುದೇ ತೆರಿಗೆ
        ವಿನಾಯಿತಿ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಭರವಸೆ ನೀಡಲಾಗುವುದಿಲ್ಲ.
      </p>
      <label className="chip">
        <input
          type="checkbox"
          checked={config.enabled}
          onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
        />
        ಪಾವತಿಗಳನ್ನು ಸಕ್ರಿಯಗೊಳಿಸಿ
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
          <legend>ಯೋಜನೆ {i + 1}</legend>
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
            ಮೊತ್ತ (ಪೈಸೆ)
            <input
              type="number"
              min="100"
              value={t.amount}
              onChange={(e) => tier(i, "amount", Number(e.target.value))}
            />
          </label>
          <label className="field">
            ಅವಧಿ
            <select
              value={t.kind}
              onChange={(e) => tier(i, "kind", e.target.value)}
            >
              <option value="once">ಒಮ್ಮೆ</option>
              <option value="monthly">ತಿಂಗಳು</option>
              <option value="yearly">ವರ್ಷ</option>
            </select>
          </label>
          <label className="field">
            ಗರಿಷ್ಠ ಅವಧಿಗಳು
            <input
              type="number"
              min="1"
              max="120"
              value={t.cycles}
              onChange={(e) => tier(i, "cycles", Number(e.target.value))}
            />
          </label>
          <label className="field wide">
            ಸೌಲಭ್ಯಗಳು (ಸಾಲಿಗೆ ಒಂದು)
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
            ಕಡಿಮೆ ಜಾಹೀರಾತುಗಳು
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
            ಯೋಜನೆ ತೆಗೆದುಹಾಕಿ
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
        ಯೋಜನೆ ಸೇರಿಸಿ
      </button>
      <button className="button button-ember" disabled={busy}>
        ಉಳಿಸಿ
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
