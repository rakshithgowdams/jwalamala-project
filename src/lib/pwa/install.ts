/** Fired by any "Download app" button; PwaControls owns the prompt and the sheet. */
export const OPEN_INSTALL_EVENT = "jwalamala:open-install";

export type InstallPlatform =
  | "installed"
  | "ios-safari"
  | "ios-chrome"
  | "ios-other"
  | "ios-in-app"
  | "other";

export function isStandaloneApp() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function installPlatform(): InstallPlatform {
  if (isStandaloneApp()) return "installed";
  const ua = navigator.userAgent || "";
  // iPadOS reports itself as a Mac; touch support gives it away.
  const ios =
    /iPhone|iPad|iPod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return "other";
  // These apps open links in their own browser, which cannot add to the Home Screen.
  if (/FBAN|FBAV|FB_IAB|Instagram|Line\/|LinkedInApp|Snapchat|Twitter|GSA\//i.test(ua))
    return "ios-in-app";
  if (/CriOS/i.test(ua)) return "ios-chrome";
  if (/FxiOS|EdgiOS|OPiOS|OPT\//i.test(ua)) return "ios-other";
  return "ios-safari";
}

export function openInstall() {
  window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));
}
