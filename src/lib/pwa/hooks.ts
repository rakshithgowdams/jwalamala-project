"use client";
import { useSyncExternalStore } from "react";
import { installPlatform, isStandaloneApp, type InstallPlatform } from "./install";
import {
  DOWNLOADS_CHANGED,
  listDownloads,
  offlineSupported,
  type Download,
} from "./offline";

const never = () => () => {};

/** Browser-only facts read after hydration; the server render assumes the safe default. */
export function useInstallPlatform(): InstallPlatform {
  return useSyncExternalStore(never, installPlatform, () => "installed");
}

export function useCanInstall() {
  return useSyncExternalStore(never, () => !isStandaloneApp(), () => false);
}

export function useOfflineSupported() {
  return useSyncExternalStore(never, offlineSupported, () => false);
}

function subscribeDownloads(onChange: () => void) {
  window.addEventListener(DOWNLOADS_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DOWNLOADS_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

let cachedRaw: string | null = null;
let cachedRows: Download[] = [];
function downloadsSnapshot() {
  const raw = localStorage.getItem("jwalamala-downloads");
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedRows = listDownloads();
  }
  return cachedRows;
}
const noDownloads: Download[] = [];

export function useDownloads(): Download[] | null {
  const rows = useSyncExternalStore(subscribeDownloads, downloadsSnapshot, () => noDownloads);
  const ready = useOfflineSupported();
  return ready ? rows : null;
}
