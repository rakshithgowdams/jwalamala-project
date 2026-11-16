"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, LogOut, ShieldCheck } from "lucide-react";
import { getBrowserClient } from "@/lib/supabase/client";
import { site } from "@/config/site";
import { LanguageSwitch, useUiStrings } from "@/components/i18n/LanguageProvider";

const roles = {
  admin: { en: "Admin", kn: "ನಿರ್ವಾಹಕ", hi: "एडमिन" },
  editor: { en: "Editor", kn: "ಸಂಪಾದಕ", hi: "संपादक" },
  reporter: { en: "Reporter", kn: "ವರದಿಗಾರ", hi: "रिपोर्टर" },
};

export function AdminTopBar({ name, email, role }: { name: string; email: string; role: string }) {
  const router = useRouter();
  const { tr } = useUiStrings();
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try {
      await getBrowserClient()?.auth.signOut();
    } finally {
      router.replace("/auth/admin");
      router.refresh();
    }
  }
  const roleName = role in roles ? tr(roles[role as keyof typeof roles]) : role;
  return (
    <header className="admin-topbar">
      <span className="admin-topbar-brand">
        <ShieldCheck size={18} aria-hidden="true" />
        {site.englishName} {tr({ en: "Admin", kn: "ನಿರ್ವಹಣೆ", hi: "एडमिन" })}
      </span>
      <div className="admin-topbar-user">
        <span className="admin-topbar-person" title={email}>
          <strong>{name}</strong>
          <small>{roleName}</small>
        </span>
        <LanguageSwitch className="admin-language" />
        <a href={site.url} target="_blank" rel="noreferrer">
          <ExternalLink size={16} aria-hidden="true" />
          <span className="admin-topbar-label">
            {tr({ en: "View site", kn: "ತಾಣ ನೋಡಿ", hi: "साइट देखें" })}
          </span>
        </a>
        <button type="button" onClick={signOut} disabled={busy}>
          <LogOut size={16} aria-hidden="true" />
          <span className="admin-topbar-label">
            {busy
              ? tr({ en: "Signing out…", kn: "ಹೊರಹೋಗುತ್ತಿದೆ…", hi: "साइन आउट हो रहा है…" })
              : tr({ en: "Sign out", kn: "ಲಾಗ್ ಔಟ್", hi: "साइन आउट" })}
          </span>
        </button>
      </div>
    </header>
  );
}
