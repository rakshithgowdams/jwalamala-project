"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import {
  defaultPush,
  pushPreferencesSchema,
  pushTopics,
  pushLabels,
  type PushPreferences,
} from "@/lib/push/schema";
export function PushSettings() {
  const { kn } = useUiStrings();
  const [prefs, setPrefs] = useState<PushPreferences>(defaultPush),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/push/preferences", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const parsed = pushPreferencesSchema.safeParse(data);
        if (parsed.success) setPrefs(parsed.data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prefs),
      });
      setMessage(response.ok ? kn.saved : kn.unavailable);
    } catch {
      setMessage(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }
  async function subscribe() {
    setBusy(true);
    try {
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (
        !key ||
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        setMessage(kn.unavailable);
        return;
      }
      if ((await Notification.requestPermission()) !== "granted") {
        setMessage(kn.subscribeError);
        return;
      }
      const registration = await navigator.serviceWorker.ready,
        raw = atob(
          key.replace(/-/g, "+").replace(/_/g, "/") +
            "=".repeat((4 - (key.length % 4)) % 4),
        ),
        bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0)),
        subscription =
          (await registration.pushManager.getSubscription()) ||
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: bytes,
          }));
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...subscription.toJSON(),
          topics: prefs.topics,
        }),
      });
      if (!response.ok) throw Error();
      const enabled = { ...prefs, enabled: true };
      const result = await fetch("/api/push/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enabled),
      });
      if (!result.ok) throw Error();
      setPrefs(enabled);
      setMessage(kn.subscribeSuccess);
    } catch {
      setMessage(kn.subscribeError);
    } finally {
      setBusy(false);
    }
  }
  async function unsubscribe() {
    setBusy(true);
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready,
          sub = await registration.pushManager.getSubscription();
        if (sub) {
          const response = await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          if (!response.ok) throw Error();
          await sub.unsubscribe();
        }
      }
      setMessage(kn.pushStoppedDevice);
    } catch {
      setMessage(kn.unavailable);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="form-grid">
      <p className="notice wide">{kn.iosGuide}</p>
      <fieldset className="field wide">
        <legend>{kn.notificationTopics}</legend>
        {pushTopics.map((topic) => (
          <label className="chip" key={topic}>
            <input
              type="checkbox"
              checked={prefs.topics.includes(topic)}
              onChange={(e) =>
                setPrefs({
                  ...prefs,
                  topics: e.target.checked
                    ? [...prefs.topics, topic]
                    : prefs.topics.filter((t) => t !== topic),
                })
              }
            />
            {pushLabels[topic]}
          </label>
        ))}
      </fieldset>
      <label className="chip">
        <input
          type="checkbox"
          checked={prefs.enabled}
          onChange={(e) => setPrefs({ ...prefs, enabled: e.target.checked })}
        />
        {kn.notificationsAllDevices}
      </label>
      <label className="field">
        {kn.dailyMax}
        <input
          type="number"
          min="1"
          max="10"
          value={prefs.daily_cap}
          onChange={(e) =>
            setPrefs({ ...prefs, daily_cap: Number(e.target.value) })
          }
        />
      </label>
      {(["quiet_start", "quiet_end"] as const).map((key, i) => (
        <label className="field" key={key}>
          {i === 0 ? kn.quietStart : kn.quietEnd}
          <select
            value={prefs[key]}
            onChange={(e) =>
              setPrefs({ ...prefs, [key]: Number(e.target.value) })
            }
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </label>
      ))}
      <label className="chip wide">
        <input
          type="checkbox"
          checked={prefs.breaking_override}
          onChange={(e) =>
            setPrefs({ ...prefs, breaking_override: e.target.checked })
          }
        />
        {kn.breakingOverride}
      </label>
      <div className="category-chips wide">
        <button
          className="button button-ember"
          disabled={busy}
          onClick={() => void save()}
        >
          {kn.save}
        </button>
        <button
          className="button button-outline"
          disabled={busy}
          onClick={() => void subscribe()}
        >
          {kn.subscribe}
        </button>
        <button
          className="button button-outline"
          disabled={busy}
          onClick={() => void unsubscribe()}
        >
          {kn.stopOnDevice}
        </button>
      </div>
      <p className="wide" role="status">
        {message}
      </p>
    </div>
  );
}
