"use client";
import { useUiStrings } from "@/components/i18n/LanguageProvider";

import { useEffect, useState } from "react";
import {
  Compass,
  Copy,
  Download,
  Menu,
  PlusSquare,
  Share,
  SquareCheck,
  WifiOff,
  X,
} from "lucide-react";
import { OPEN_INSTALL_EVENT, installPlatform } from "@/lib/pwa/install";
import { useInstallPlatform } from "@/lib/pwa/hooks";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};

const DISMISS_KEY = "jwalamala-install-dismissed";

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

  const platform = useInstallPlatform();
  const [prompt, setPrompt] = useState<InstallEvent | null>(null),
    [show, setShow] = useState(false),
    [copied, setCopied] = useState(false),
    [waiting, setWaiting] = useState<ServiceWorker | null>(null),
    [toast, setToast] = useState("");

  function hideInstall() {
    rememberDismiss();
    setShow(false);
  }

  async function runPrompt(event: InstallEvent) {
    await event.prompt();
    await event.userChoice;
    setPrompt(null);
    setShow(false);
  }

  useEffect(() => {
    let alive = true;
    let toastTimer: ReturnType<typeof setTimeout>;
    let iosTimer: ReturnType<typeof setTimeout>;
    let deferred: InstallEvent | null = null;
    const current = installPlatform();
    const notify = (message: string) => {
      setToast(message);
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => setToast(""), 5000);
    };
    const offline = () => notify(kn.offline),
      online = () => notify(kn.online);
    const install = (event: Event) => {
      event.preventDefault();
      deferred = event as InstallEvent;
      setPrompt(deferred);
      if (
        Number(localStorage.getItem("jwalamala-visits") || 0) >= 2 &&
        !installWasDismissed()
      )
        setShow(true);
    };
    // A "Download app" button opens the browser's own prompt when there is one,
    // and the step-by-step sheet everywhere else (iPhone, iPad, desktop Safari).
    const openRequested = () => {
      if (deferred) {
        void runPrompt(deferred);
        deferred = null;
        return;
      }
      setCopied(false);
      setShow(true);
    };
    const installed = () => {
      deferred = null;
      setPrompt(null);
      setShow(false);
    };
    if (!sessionStorage.getItem("jwalamala-visit")) {
      localStorage.setItem(
        "jwalamala-visits",
        String(Number(localStorage.getItem("jwalamala-visits") || 0) + 1),
      );
      sessionStorage.setItem("jwalamala-visit", "1");
    }
    if (current.startsWith("ios-") && !installWasDismissed()) {
      iosTimer = setTimeout(() => {
        if (alive) setShow(true);
      }, 1200);
    }
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("appinstalled", installed);
    window.addEventListener(OPEN_INSTALL_EVENT, openRequested);
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
      window.removeEventListener("appinstalled", installed);
      window.removeEventListener(OPEN_INSTALL_EVENT, openRequested);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [kn.offline, kn.online]);

  const ios = platform.startsWith("ios-");
  const steps: { Icon: typeof Share; text: string }[] =
    platform === "ios-safari"
      ? [
          { Icon: Share, text: kn.iosStepShare },
          { Icon: PlusSquare, text: kn.iosStepHome },
          { Icon: SquareCheck, text: kn.iosStepAdd },
        ]
      : platform === "ios-chrome"
        ? [
            { Icon: Share, text: kn.iosChromeStepShare },
            { Icon: PlusSquare, text: kn.iosStepHome },
            { Icon: SquareCheck, text: kn.iosStepAdd },
          ]
        : platform === "ios-other"
          ? [
              { Icon: Menu, text: kn.iosOtherStepMenu },
              { Icon: PlusSquare, text: kn.iosStepHome },
              { Icon: SquareCheck, text: kn.iosStepAdd },
            ]
          : platform === "ios-in-app"
            ? [
                { Icon: Compass, text: kn.iosInAppStep },
                { Icon: Share, text: kn.iosStepShare },
                { Icon: PlusSquare, text: kn.iosStepHome },
              ]
            : [{ Icon: Menu, text: kn.otherInstallStep }];
  const sheetOpen = show && platform !== "installed";

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
            aria-labelledby="install-sheet-title"
          >
            <span className="install-sheet-handle" aria-hidden="true" />
            <div className="install-sheet-head">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/apple-touch-icon.png"
                alt=""
                width={52}
                height={52}
                className="install-sheet-icon"
              />
              <div>
                <h3 id="install-sheet-title">
                  {prompt && !ios ? kn.install : kn.downloadApp}
                </h3>
                <p>{kn.installDescription}</p>
              </div>
            </div>
            {prompt && !ios ? null : (
              <ol className="install-ios-steps">
                {steps.map(({ Icon, text }, index) => (
                  <li key={text}>
                    <span className="install-step-number">{index + 1}</span>
                    <Icon size={17} aria-hidden="true" />
                    <span>{text}</span>
                  </li>
                ))}
              </ol>
            )}
            <div className="install-sheet-actions">
              {prompt && !ios ? (
                <button
                  className="button button-ember"
                  onClick={() => void runPrompt(prompt)}
                >
                  <Download size={17} aria-hidden="true" />
                  {kn.installButton}
                </button>
              ) : platform === "ios-in-app" ? (
                <button
                  className="button button-ember"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(location.href);
                      setCopied(true);
                    } catch {
                      setCopied(false);
                    }
                  }}
                >
                  <Copy size={17} aria-hidden="true" />
                  {copied ? kn.linkCopied : kn.copyLink}
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
