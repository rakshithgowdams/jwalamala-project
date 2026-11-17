"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Lock, Send, ShieldAlert } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import { useDeskPath } from "@/components/admin/DeskPathProvider";
import {
  createAccessRequest,
  getOpenAccessRequestStatus,
} from "@/app/admin/access-requests/actions";
import type { Tri } from "@/lib/i18n/strings";

type LockedFeature = { key: string; label: Tri };

type Props = {
  sectionKey: string;
  sectionLabel: Tri | null;
  fromPath: string;
  alreadyHas: boolean;
  canRequest: boolean;
  lockedFeatures: LockedFeature[];
};

export function NoAccessPanel({
  sectionKey,
  sectionLabel,
  fromPath,
  alreadyHas,
  canRequest,
  lockedFeatures,
}: Props) {
  const { tr } = useUiStrings();
  const basePath = useDeskPath();
  const [pending, start] = useTransition();
  const [note, setNote] = useState("");
  const [picked, setPicked] = useState(sectionKey);
  const [existingOpen, setExistingOpen] = useState(false);
  const [checking, setChecking] = useState(Boolean(sectionKey && canRequest));
  const [message, setMessage] = useState<{ error?: string; ok?: string }>({});

  const activeKey = sectionKey || picked;
  const activeLabel =
    sectionLabel ||
    lockedFeatures.find((f) => f.key === activeKey)?.label ||
    null;
  const feature = activeLabel
    ? tr(activeLabel)
    : activeKey || tr({ en: "this area", kn: "ಈ ಭಾಗ", hi: "यह क्षेत्र" });
  const showForm = Boolean(
    (canRequest && sectionKey) || (!sectionKey && lockedFeatures.length && activeKey),
  );

  useEffect(() => {
    if (!activeKey || alreadyHas) {
      setChecking(false);
      setExistingOpen(false);
      return;
    }
    let alive = true;
    setChecking(true);
    void getOpenAccessRequestStatus({ sectionKey: activeKey }).then((result) => {
      if (!alive) return;
      setExistingOpen(Boolean(result.open));
      setChecking(false);
    });
    return () => {
      alive = false;
    };
  }, [activeKey, alreadyHas]);

  function submit() {
    if (!activeKey || pending || existingOpen || alreadyHas) return;
    setMessage({});
    start(async () => {
      const result = await createAccessRequest({ sectionKey: activeKey, staffNote: note });
      if (result.error) setMessage({ error: result.error });
      else {
        setExistingOpen(true);
        setMessage({
          ok: tr({
            en: "Request sent to admin. You will get access after approval.",
            kn: "ಆಡ್ಮಿನ್‌ಗೆ ವಿನಂತಿ ಕಳುಹಿಸಲಾಯಿತು. ಅನುಮೋದನೆಯ ನಂತರ ಪ್ರವೇಶ ಸಿಗುತ್ತದೆ.",
            hi: "एडमिन को अनुरोध भेजा। स्वीकृति के बाद पहुँच मिलेगी।",
          }),
        });
      }
    });
  }

  return (
    <>
      <div className="section-title">
        <h1>{tr({ en: "Restricted", kn: "ನಿರ್ಬಂಧಿತ", hi: "प्रतिबंधित" })}</h1>
      </div>
      <section className="utility-panel no-access">
        <ShieldAlert size={28} aria-hidden="true" />
        <h2>
          {tr({
            en: "You are restricted",
            kn: "ನಿಮಗೆ ನಿರ್ಬಂಧವಿದೆ",
            hi: "आप प्रतिबंधित हैं",
          })}
        </h2>
        <p>
          {alreadyHas
            ? tr({
                en: `Access to ${feature} is already on your account. Refresh or open it from the menu.`,
                kn: `${feature} ಪ್ರವೇಶ ನಿಮ್ಮ ಖಾತೆಯಲ್ಲಿದೆ. ರಿಫ್ರೆಶ್ ಮಾಡಿ ಅಥವಾ ಮೆನುವಿನಿಂದ ತೆರೆಯಿರಿ.`,
                hi: `${feature} की पहुँच आपके खाते में है। रिफ़्रेश करें या मेनू से खोलें।`,
              })
            : sectionKey
              ? tr({
                  en: `You do not have access to ${feature}. Request access and an administrator can approve it under Access requests.`,
                  kn: `ನಿಮಗೆ ${feature} ಪ್ರವೇಶವಿಲ್ಲ. ವಿನಂತಿ ಕಳುಹಿಸಿ; ಆಡ್ಮಿನ್ Access requests ನಲ್ಲಿ ಅನುಮೋದಿಸಬಹುದು.`,
                  hi: `आपके पास ${feature} की पहुँच नहीं है। अनुरोध भेजें; एडमिन Access requests में स्वीकृत कर सकते हैं।`,
                })
              : tr({
                  en: "Pick a feature below and request access. An administrator reviews it under Access requests.",
                  kn: "ಕೆಳಗೆ ವೈಶಿಷ್ಟ್ಯ ಆಯ್ಕೆಮಾಡಿ ಮತ್ತು ಪ್ರವೇಶ ವಿನಂತಿಸಿ. ಆಡ್ಮಿನ್ Access requests ನಲ್ಲಿ ಪರಿಶೀಲಿಸುತ್ತಾರೆ.",
                  hi: "नीचे सुविधा चुनें और पहुँच अनुरोध करें। एडमिन Access requests में समीक्षा करते हैं।",
                })}
        </p>
        {fromPath ? (
          <p className="task-request-admin-note">
            <Lock size={14} aria-hidden="true" /> {fromPath}
          </p>
        ) : null}

        {!sectionKey && lockedFeatures.length ? (
          <label className="field no-access-request">
            <span>{tr({ en: "Feature", kn: "ವೈಶಿಷ್ಟ್ಯ", hi: "सुविधा" })}</span>
            <select
              value={picked}
              onChange={(e) => {
                setPicked(e.target.value);
                setMessage({});
                setExistingOpen(false);
              }}
            >
              <option value="">
                {tr({ en: "Choose a feature…", kn: "ವೈಶಿಷ್ಟ್ಯ ಆಯ್ಕೆಮಾಡಿ…", hi: "सुविधा चुनें…" })}
              </option>
              {lockedFeatures.map((item) => (
                <option key={item.key} value={item.key}>
                  {tr(item.label)}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {existingOpen || message.ok ? (
          <p role="status">
            {message.ok ||
              tr({
                en: "Your access request is waiting for admin approval.",
                kn: "ನಿಮ್ಮ ಪ್ರವೇಶ ವಿನಂತಿ ಆಡ್ಮಿನ್ ಅನುಮೋದನೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ.",
                hi: "आपका पहुँच अनुरोध एडमिन स्वीकृति की प्रतीक्षा में है।",
              })}
          </p>
        ) : null}
        {message.error ? <p role="alert">{message.error}</p> : null}

        {showForm && !existingOpen && !message.ok && !alreadyHas ? (
          <div className="no-access-request">
            <label className="field">
              <span>
                {tr({
                  en: "Why do you need access?",
                  kn: "ನಿಮಗೆ ಪ್ರವೇಶ ಏಕೆ ಬೇಕು?",
                  hi: "आपको पहुँच क्यों चाहिए?",
                })}
              </span>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={1000}
                disabled={checking || pending}
                placeholder={tr({
                  en: "Short note for the administrator (optional)",
                  kn: "ಆಡ್ಮಿನ್‌ಗೆ ಸಂಕ್ಷಿಪ್ತ ಟಿಪ್ಪಣಿ (ಐಚ್ಛಿಕ)",
                  hi: "एडमिन के लिए संक्षिप्त नोट (वैकल्पिक)",
                })}
              />
            </label>
            <button type="button" className="button" disabled={pending || checking || !activeKey} onClick={submit}>
              <Send size={15} aria-hidden="true" />
              {pending
                ? tr({ en: "Sending…", kn: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…", hi: "भेजा जा रहा है…" })
                : checking
                  ? tr({ en: "Checking…", kn: "ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ…", hi: "जाँच हो रही है…" })
                  : tr({ en: "Request access", kn: "ಪ್ರವೇಶ ವಿನಂತಿಸಿ", hi: "पहुँच अनुरोध करें" })}
            </button>
          </div>
        ) : null}

        <Link href={basePath} className="button button-outline">
          {tr({ en: "Back to home", kn: "ಮುಖಪುಟಕ್ಕೆ", hi: "होम पर वापस" })}
        </Link>
      </section>
    </>
  );
}
