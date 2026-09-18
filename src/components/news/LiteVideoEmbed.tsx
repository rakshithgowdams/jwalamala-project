"use client";
import { useState, useEffect, useRef } from "react";
import { ProgressiveImage as Image } from "@/components/ui/ProgressiveImage";
import { Play, VideoOff } from "lucide-react";
import { usePathname } from "next/navigation";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { normalizeVideo } from "@/lib/utils/video";
import { loadYouTube, type YouTubePlayer } from "@/lib/v4/youtube-player";
import {
  watchSchema,
  WATCH_KEY,
  saveWatch,
  type WatchItem,
} from "@/lib/v4/watch-history";
import { useLocalValue } from "@/lib/v4/local-store";
const empty: WatchItem[] = [];
export function LiteVideoEmbed({
  url,
  thumbnail,
  title,
  postId,
  keyPoints = [],
}: {
  url: string | null;
  thumbnail: string;
  title: string;
  postId?: string;
  keyPoints?: { seconds: number; label_kn: string }[];
}) {
  const { kn } = useUiStrings();
  const [playing, setPlaying] = useState(false),
    [start, setStart] = useState(0),
    [error, setError] = useState(false);
  const [history] = useLocalValue(WATCH_KEY, watchSchema, empty);
  const frame = useRef<HTMLDivElement>(null),
    player = useRef<YouTubePlayer | null>(null);
  const href = usePathname();
  const video = url ? normalizeVideo(url) : null;
  const id = video?.id;
  const provider = video?.provider;
  const saved = history.find((r) => r.id === postId)?.seconds || 0;
  useEffect(() => {
    if (!playing || provider !== "youtube" || !id || !frame.current) return;
    let active = true,
      timer: ReturnType<typeof setInterval> | undefined;
    const container = frame.current;
    const placeholder = document.createElement("div");
    container.appendChild(placeholder);
    void loadYouTube()
      .then((api) => {
        if (!active) return;
        player.current = new api.Player(placeholder, {
          host: "https://www.youtube-nocookie.com",
          videoId: id,
          playerVars: {
            autoplay: 1,
            start: Math.floor(start),
            origin: location.origin,
            playsinline: 1,
          },
          events: {
            onReady: ({ target }) => {
              if (!active) return;
              target.playVideo();
              timer = setInterval(() => {
                if (!postId || !/^\/video\/[a-z0-9-]+$/.test(href)) return;
                const seconds = target.getCurrentTime(),
                  duration = target.getDuration();
                if (
                  Number.isFinite(seconds) &&
                  seconds >= 0 &&
                  seconds <= 172800
                )
                  saveWatch({
                    id: postId,
                    href,
                    title,
                    seconds:
                      duration > 0 && seconds >= duration - 5 ? 0 : seconds,
                    updated_at: new Date().toISOString(),
                  });
              }, 10000);
            },
            onError: () => {
              if (active) setError(true);
            },
          },
        });
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
      clearInterval(timer);
      try {
        player.current?.destroy();
      } catch {}
      player.current = null;
      container.replaceChildren();
    };
  }, [playing, provider, id, start, postId, href, title]);
  if (!video)
    return (
      <div className="video-player">
        <div className="video-unavailable">
          <VideoOff size={35} />
          <p>{kn.noVideo}</p>
        </div>
      </div>
    );
  function jump(seconds: number) {
    if (player.current) {
      player.current.seekTo(seconds, true);
      player.current.playVideo();
    } else {
      setStart(seconds);
      setPlaying(true);
    }
  }
  return (
    <>
      <div className="video-player">
        {error ? (
          <div className="video-unavailable">
            <p>{kn.noVideo}</p>
            <a
              className="chip"
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {kn.openVideo}
            </a>
          </div>
        ) : playing ? (
          provider === "youtube" ? (
            <div className="youtube-api-frame" ref={frame} />
          ) : (
            <iframe
              title={title}
              src={
                "https://www.facebook.com/plugins/video.php?href=" +
                encodeURIComponent(video.url) +
                "&autoplay=true"
              }
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          )
        ) : (
          <button onClick={() => jump(saved)} aria-label={kn.watch}>
            <Image
              src={thumbnail}
              alt=""
              fill
              sizes="(max-width:900px) 100vw,800px"
            />
            <span className="play-circle">
              <Play size={30} fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      {provider === "youtube" && (
        <>
          {!playing && saved > 5 && (
            <div className="share-buttons">
              <span>
                {kn.resumeAt} {Math.floor(saved / 60)}:
                {String(Math.floor(saved % 60)).padStart(2, "0")}
              </span>
              <button className="chip" onClick={() => jump(0)}>
                {kn.startOver}
              </button>
            </div>
          )}
          {keyPoints.length > 0 && (
            <nav className="key-facts" aria-label="Video chapters">
              {keyPoints.map((point, i) => (
                <button
                  className="chip"
                  key={i}
                  onClick={() => jump(point.seconds)}
                >
                  {Math.floor(point.seconds / 60)}:
                  {String(point.seconds % 60).padStart(2, "0")} ·{" "}
                  {point.label_kn}
                </button>
              ))}
            </nav>
          )}
        </>
      )}
    </>
  );
}
