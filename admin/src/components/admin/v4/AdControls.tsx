"use client";
import { useState } from "react";
import { saveAdSettings, saveAdSlot } from "@/app/admin/ad-settings/actions";
import type { AdSettings, SlotConfig } from "@/lib/ads/schema";
import { v4 as t, kn } from "@/content/strings.kn";
export function AdControls({
  settings,
  slots,
  cspReady,
}: {
  settings: AdSettings;
  slots: SlotConfig[];
  cspReady: boolean;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <p className="notice">{cspReady ? t.adCspReady : t.adCspMissing}</p>
      <form
        className="form-grid"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          try {
            const result = await saveAdSettings({
              ...Object.fromEntries(f),
              enabled: f.has("enabled"),
              adsense_enabled: f.has("adsense_enabled"),
              test_mode: f.has("test_mode"),
              sticky_mobile_enabled: f.has("sticky_mobile_enabled"),
            });
            setMessage(result.error || t.saved);
          } catch {
            setMessage(t.failed);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            "enabled",
            "adsense_enabled",
            "test_mode",
            "sticky_mobile_enabled",
          ] as const
        ).map((k) => (
          <label className="poll-option" key={k}>
            <input name={k} type="checkbox" defaultChecked={settings[k]} />
            {k}
          </label>
        ))}
        <label className="field">
          AdSense publisher ID
          <input
            name="adsense_client_id"
            pattern="ca-pub-[0-9]{16}"
            defaultValue={settings.adsense_client_id}
          />
        </label>
        <label className="field wide">
          ads.txt
          <textarea name="ads_txt" defaultValue={settings.ads_txt} />
        </label>
        <button className="button button-ember" disabled={busy}>
          {kn.save}
        </button>
      </form>
      <h2>{t.adSlots}</h2>
      <div className="community-grid">
        {slots.map((slot) => (
          <form
            className="utility-panel"
            key={slot.slot_key}
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              setBusy(true);
              try {
                const result = await saveAdSlot({
                  ...Object.fromEntries(f),
                  slot_key: slot.slot_key,
                  enabled: f.has("enabled"),
                });
                setMessage(result.error || t.saved);
              } catch {
                setMessage(t.failed);
              } finally {
                setBusy(false);
              }
            }}
          >
            <h3>{slot.slot_key}</h3>
            <label className="field">
              {kn.status}
              <select name="mode" defaultValue={slot.mode}>
                {["manual", "google", "manual_then_google", "off"].map(
                  (mode) => (
                    <option key={mode}>{mode}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field">
              AdSense slot ID
              <input
                name="adsense_slot_id"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={slot.adsense_slot_id}
              />
            </label>
            <label className="field">
              {t.format}
              <select name="adsense_format" defaultValue={slot.adsense_format}>
                {["auto", "fluid", "in-article"].map((format) => (
                  <option key={format}>{format}</option>
                ))}
              </select>
            </label>
            <label className="poll-option">
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={slot.enabled}
              />
              {t.enabled}
            </label>
            <button disabled={busy} className="button button-outline">
              {kn.save}
            </button>
          </form>
        ))}
      </div>
      <p role="status">{message}</p>
    </>
  );
}
