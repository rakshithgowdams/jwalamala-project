"use client";
import { Download } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { openInstall } from "@/lib/pwa/install";
import { useCanInstall } from "@/lib/pwa/hooks";

export function InstallAppButton({
  className = "button button-outline install-app-button",
  onOpen,
}: {
  className?: string;
  onOpen?: () => void;
}) {
  const { kn } = useUiStrings();
  const visible = useCanInstall();
  if (!visible) return null;
  return (
    <button
      type="button"
      className={className}
      aria-label={kn.downloadApp}
      onClick={() => {
        onOpen?.();
        openInstall();
      }}
    >
      <Download size={17} aria-hidden="true" />
      <span className="install-app-label">{kn.downloadApp}</span>
      <span className="install-app-short" aria-hidden="true">
        {kn.appShort}
      </span>
    </button>
  );
}
