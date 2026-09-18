export type YouTubePlayer = {
  getCurrentTime(): number;
  getDuration(): number;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
};
type Api = {
  Player: new (
    element: HTMLElement,
    options: {
      host: string;
      videoId: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: (event: { target: YouTubePlayer }) => void;
        onError: () => void;
      };
    },
  ) => YouTubePlayer;
};
let promise: Promise<Api> | null = null;
export function loadYouTube(): Promise<Api> {
  const win = window as typeof window & {
    YT?: Api;
    onYouTubeIframeAPIReady?: () => void;
  };
  if (win.YT?.Player) return Promise.resolve(win.YT);
  if (promise) return promise;
  promise = new Promise((resolve, reject) => {
    const prior = win.onYouTubeIframeAPIReady;
    const timer = setTimeout(() => {
      promise = null;
      reject(Error("YouTube unavailable"));
    }, 20000);
    win.onYouTubeIframeAPIReady = () => {
      clearTimeout(timer);
      prior?.();
      if (win.YT) resolve(win.YT);
      else reject(Error("YouTube unavailable"));
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    const nonce = document
      .querySelector("script[nonce]")
      ?.getAttribute("nonce");
    if (nonce) script.nonce = nonce;
    script.onerror = () => {
      clearTimeout(timer);
      promise = null;
      script.remove();
      reject(Error("YouTube unavailable"));
    };
    document.head.appendChild(script);
  });
  return promise;
}
