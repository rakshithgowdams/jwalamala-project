"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { brandName } from "@/lib/i18n/content";

import Link from "next/link";
import { createContext, useContext, useRef, useState, useEffect } from "react";
import { Play, Pause, X, Volume2 } from "lucide-react";

type Track = { url: string; title: string; href: string };
const AudioContext = createContext<{ play: (track: Track) => void }>({
  play: () => {},
});
export function AudioProvider({ children }: { children: React.ReactNode }) {
  const { v4: t, locale } = useUiStrings();

  const audio = useRef<HTMLAudioElement>(null),
    [track, setTrack] = useState<Track | null>(null),
    [playing, setPlaying] = useState(false),
    [position, setPosition] = useState(0),
    [duration, setDuration] = useState(0),
    [speed, setSpeed] = useState(1),
    [error, setError] = useState("");
  useEffect(() => {
    if (!track || !audio.current) return;
    const player = audio.current;
    void player.play().catch(() => setError(t.audioPlayFailed));
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: brandName(locale),
      });
      navigator.mediaSession.setActionHandler("play", () => void player.play());
      navigator.mediaSession.setActionHandler("pause", () => player.pause());
      navigator.mediaSession.setActionHandler("seekbackward", () => {
        player.currentTime = Math.max(0, player.currentTime - 10);
      });
      navigator.mediaSession.setActionHandler("seekforward", () => {
        player.currentTime = Math.min(player.duration, player.currentTime + 10);
      });
    }
    return () => {
      if ("mediaSession" in navigator) {
        for (const action of [
          "play",
          "pause",
          "seekbackward",
          "seekforward",
        ] as MediaSessionAction[])
          navigator.mediaSession.setActionHandler(action, null);
        navigator.mediaSession.metadata = null;
      }
    };
  }, [track, t.audioPlayFailed, locale]);
  return (
    <AudioContext.Provider
      value={{
        play: (next) => {
          setTrack(next);
          setError("");
          window.dispatchEvent(
            new CustomEvent("jwalamala-engagement", { detail: "listen" }),
          );
        },
      }}
    >
      {children}
      {track && (
        <aside className="audio-bar" aria-label={t.listen}>
          <audio
            ref={audio}
            src={track.url}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => setPlaying(false)}
            onTimeUpdate={() => setPosition(audio.current?.currentTime || 0)}
            onLoadedMetadata={() => {
              setDuration(
                Number.isFinite(audio.current?.duration)
                  ? audio.current!.duration
                  : 0,
              );
              if (audio.current) audio.current.playbackRate = speed;
            }}
            onError={() => setError(t.audioPlayFailed)}
          />
          <Link href={track.href}>{track.title}</Link>
          <button
            aria-label={playing ? t.pause : t.resume}
            className="icon-button"
            onClick={() => {
              if (playing) audio.current?.pause();
              else
                void audio.current
                  ?.play()
                  .catch(() => setError(t.audioPlayFailed));
            }}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          <button
            className="chip"
            onClick={() => {
              if (audio.current)
                audio.current.currentTime = Math.max(0, position - 10);
            }}
          >
            −10s
          </button>
          <input
            aria-label={t.audioProgress}
            type="range"
            min={0}
            max={duration || 1}
            value={position}
            step={1}
            onChange={(e) => {
              if (audio.current)
                audio.current.currentTime = Number(e.target.value);
            }}
          />
          <button
            className="chip"
            onClick={() => {
              if (audio.current)
                audio.current.currentTime = Math.min(duration, position + 10);
            }}
          >
            +10s
          </button>
          <select
            aria-label={t.audioSpeed}
            value={speed}
            onChange={(e) => {
              const value = Number(e.target.value);
              setSpeed(value);
              if (audio.current) audio.current.playbackRate = value;
            }}
          >
            {[0.75, 1, 1.25, 1.5].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <button
            className="icon-button"
            aria-label={t.closeMenu}
            onClick={() => {
              audio.current?.pause();
              setTrack(null);
            }}
          >
            <X />
          </button>
          {error && <p role="status">{error}</p>}
        </aside>
      )}
    </AudioContext.Provider>
  );
}
export function ListenButton({
  url,
  title,
  href,
}: {
  url: string;
  title: string;
  href: string;
}) {
  const { v4: t } = useUiStrings();
  const { play } = useContext(AudioContext);
  return (
    <button
      className="button button-outline"
      onClick={() => play({ url, title, href })}
    >
      <Volume2 size={18} />
      {t.listen}
    </button>
  );
}
