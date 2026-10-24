"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import { Download, PlusSquare, Share, WifiOff, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "jwalamala-install-dismissed";

function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function isIosSafari() {
  const ua = navigator.userAgent || "";
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && !isStandaloneApp();
}

function installWasDismissed() {
  if (sessionStorage.getItem("install-dismissed")) return true;
  return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
}

function rememberDismiss(days = 7) {
  sessionStorage.setItem("install-dismissed", "1");
  localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86_400_000));
}

export function PwaControls() {
  const { kn } = useUiStrings();

  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [ios, setIos] = useState(false),
    [show, setShow] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [toast, setToast] = useState("");

  function hideInstall() {
    rememberDismiss();
    setShow(false);
  }

  useEffect(() => {
    let alive = true;
    let toastTimer: ReturnType<typeof setTimeout>;
    let iosTimer: ReturnType<typeof setTimeout>;
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
        !installWasDismissed()
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
    if (isIosSafari() && !installWasDismissed()) {
      setIos(true);
      iosTimer = setTimeout(() => {
        if (alive) setShow(true);
      }, 1200);
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
      clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [kn.offline, kn.online]);
  const sheetOpen = show && (prompt || ios);
  return (
    <>
      {sheetOpen ? (
        <>
          <button
            type="button"
            className="install-sheet-backdrop"
            aria-label={kn.close}
            onClick={hideInstall}
          />
          <aside
            className="install-banner is-sheet"
            role="dialog"
            aria-modal="true"
            aria-label={ios ? kn.downloadApp : kn.install}
          >
            <span className="install-sheet-handle" aria-hidden="true" />
            <h3>
              <Download size={18} /> {ios ? kn.downloadApp : kn.install}
            </h3>
            <p>{ios ? kn.iosGuide : kn.installDescription}</p>
            {ios ? (
              <ol className="install-ios-steps">
                <li>
                  <Share size={16} aria-hidden="true" />
                  {kn.iosStepShare}
                </li>
                <li>
                  <PlusSquare size={16} aria-hidden="true" />
                  {kn.iosStepHome}
                </li>
              </ol>
            ) : null}
            <div>
              {prompt && !ios ? (
                <button
                  className="button button-ember"
                  onClick={async () => {
                    await prompt.prompt();
                    await prompt.userChoice;
                    hideInstall();
                    setPrompt(null);
                  }}
                >
                  {kn.installButton}
                </button>
              ) : (
                <button className="button button-ember" onClick={hideInstall}>
                  {kn.iosGotIt}
                </button>
              )}
              <button className="button button-outline" onClick={hideInstall}>
                {kn.later}
              </button>
            </div>
            <button
              type="button"
              className="icon-button install-sheet-close"
              aria-label={kn.close}
              onClick={hideInstall}
            >
              <X size={18} />
            </button>
          </aside>
        </>
      ) : null}
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
