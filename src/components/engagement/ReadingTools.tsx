"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import { z } from "zod";
import { site } from "@/config/site";
import { getBrowserClient } from "@/lib/supabase/client";
import { Volume2, Square, Pause, Play } from "lucide-react";

import {
  useLocalValue,
  historySchema,
  HISTORY_KEY,
} from "@/lib/v4/local-store";
const settingsSchema = z.object({
  size: z.number().min(16).max(26),
  spacing: z.number().min(1.6).max(2.4),
  contrast: z.boolean(),
  wordSpacing: z.boolean().default(false),
});
const defaults = {
  size: 18,
  spacing: 1.8,
  contrast: false,
  wordSpacing: false,
};
export function ReadingTools({
  postId,
  title,
  href,
}: {
  postId: string;
  title: string;
  href: string;
}) {
  const { v4: t } = useUiStrings();

  const [settings, setSettings] = useLocalValue(
    "jwalamala-reading",
    settingsSchema,
    defaults,
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false),
    [paused, setPaused] = useState(false);
  useEffect(() => {
    const body = document.getElementById("article-body");
    if (body) {
      body.style.fontSize = settings.size + "px";
      body.style.lineHeight = String(settings.spacing);
      body.style.wordSpacing = settings.wordSpacing ? ".2em" : "normal";
      body.style.letterSpacing = settings.wordSpacing ? ".035em" : "normal";
      body.classList.toggle("reading-contrast", settings.contrast);
    }
  }, [settings]);
  useEffect(() => {
    try {
      const parsed = historySchema.safeParse(
        JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"),
      );
      const history = parsed.success ? parsed.data : [];
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(
          [
            { id: postId, title, href, viewed_at: new Date().toISOString() },
            ...history.filter((item) => item.id !== postId),
          ].slice(0, 200),
        ),
      );
      window.dispatchEvent(new Event("jwalamala-local"));
    } catch {
      /* Storage is optional. */
    }
    if (!site.demo && z.uuid().safeParse(postId).success) {
      const db = getBrowserClient();
      if (db)
        void db.auth
          .getUser()
          .then(({ data: { user } }) => {
            if (user)
              return db.from("reading_history").upsert({
                user_id: user.id,
                post_id: postId,
                last_viewed_at: new Date().toISOString(),
              });
          })
          .catch(() => {});
    }
    if (!("speechSynthesis" in window)) return;
    const sync = () =>
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter((voice) => voice.lang.toLowerCase().startsWith("kn")),
      );
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    const timer = window.setTimeout(sync, 0);
    return () => {
      window.clearTimeout(timer);
      window.speechSynthesis.removeEventListener("voiceschanged", sync);
      window.speechSynthesis.cancel();
    };
  }, [postId, title, href]);
  function listen() {
    const article = document.getElementById("article-body")?.cloneNode(true) as
      HTMLElement | undefined;
    article
      ?.querySelectorAll("[data-ad-placement]")
      .forEach((ad) => ad.remove());
    const text = article?.textContent;
    if (!text || !voices[0]) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(title + ". " + text);
    utterance.lang = "kn-IN";
    utterance.voice = voices[0];
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    window.speechSynthesis.speak(utterance);
    window.dispatchEvent(
      new CustomEvent("jwalamala-engagement", { detail: "listen" }),
    );
    setSpeaking(true);
  }
  return (
    <div className="reading-toolbar" role="group" aria-label={t.readingTools}>
      <span className="meta">{t.textSize}</span>
      {[16, 18, 22].map((size, i) => (
        <button
          className="chip"
          key={size}
          aria-pressed={settings.size === size}
          onClick={() => setSettings({ ...settings, size })}
        >
          {["A−", "A", "A+"][i]}
        </button>
      ))}
      <button
        className="chip"
        aria-pressed={settings.spacing > 1.8}
        onClick={() =>
          setSettings({
            ...settings,
            spacing: settings.spacing > 1.8 ? 1.8 : 2.2,
          })
        }
      >
        {t.lineSpace}
      </button>
      <button
        className="chip"
        aria-pressed={settings.contrast}
        onClick={() =>
          setSettings({ ...settings, contrast: !settings.contrast })
        }
      >
        {t.contrast}
      </button>
      <button
        className="chip"
        aria-pressed={settings.wordSpacing}
        onClick={() =>
          setSettings({ ...settings, wordSpacing: !settings.wordSpacing })
        }
      >
        {t.lineSpace} +
      </button>
      {voices.length > 0 &&
        (!speaking ? (
          <button className="chip" onClick={listen}>
            <Volume2 size={16} />
            {t.listen}
          </button>
        ) : (
          <>
            <button
              className="chip"
              onClick={() => {
                if (paused) window.speechSynthesis.resume();
                else window.speechSynthesis.pause();
                setPaused(!paused);
              }}
            >
              {paused ? <Play size={16} /> : <Pause size={16} />}{" "}
              {paused ? t.resume : t.pause}
            </button>
            <button
              className="chip"
              onClick={() => {
                window.speechSynthesis.cancel();
                setSpeaking(false);
                setPaused(false);
              }}
            >
              <Square size={16} />
              {t.stop}
            </button>
          </>
        ))}
    </div>
  );
}
