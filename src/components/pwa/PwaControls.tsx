"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import { Download, X, WifiOff } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function PwaControls() {
  const { kn } = useUiStrings();

  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [show, setShow] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [toast, setToast] = useState("");
  useEffect(() => {
    let alive = true;
    let toastTimer: ReturnType<typeof setTimeout>;
    const notify = (message: string) => {
      setToast(message);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(""), 5000);
    };
    const offline = () => notify(kn.offline),
      online = () => notify(kn.online);
    const install = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
      if (
        Number(localStorage.getItem("jwalamala-visits") || 0) >= 2 &&
        !sessionStorage.getItem("install-dismissed")
      )
        setShow(true);
    };
    if (!sessionStorage.getItem("jwalamala-visit")) {
      localStorage.setItem(
        "jwalamala-visits",
        String(Number(localStorage.getItem("jwalamala-visits") || 0) + 1),
      );
      sessionStorage.setItem("jwalamala-visit", "1");
    }
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          if (!alive) return;
          if (reg.waiting) setWaiting(reg.waiting);
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (
                alive &&
                worker.state === "installed" &&
                navigator.serviceWorker.controller
              )
                setWaiting(worker);
            });
          });
        })
        .catch(() => {});
    }
    return () => {
      alive = false;
      clearTimeout(toastTimer);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [kn.offline, kn.online]);
  return (
    <>
      {show && prompt && (
        <aside className="install-banner" aria-label={kn.install}>
          <h3>
            <Download size={18} /> {kn.install}
          </h3>
          <p>{kn.installDescription}</p>
          <div>
            <button
              className="button button-ember"
              onClick={async () => {
                await prompt.prompt();
                await prompt.userChoice;
                setShow(false);
                setPrompt(null);
              }}
            >
              {kn.installButton}
            </button>
            <button
              className="button button-outline"
              onClick={() => {
                setShow(false);
                sessionStorage.setItem("install-dismissed", "1");
              }}
            >
              {kn.later}
            </button>
          </div>
        </aside>
      )}
      {waiting && (
        <div className="toast" role="status">
          {kn.update}
          <button
            className="button button-ember"
            onClick={() => {
              navigator.serviceWorker.addEventListener(
                "controllerchange",
                () => location.reload(),
                { once: true },
              );
              waiting.postMessage({ type: "SKIP_WAITING" });
            }}
          >
            {kn.refresh}
          </button>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <WifiOff size={17} />
          {toast}
          <button
            className="icon-button"
            aria-label={kn.close}
            onClick={() => setToast("")}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
