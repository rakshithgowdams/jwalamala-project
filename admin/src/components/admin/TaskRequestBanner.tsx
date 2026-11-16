"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Send } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import {
  completeTaskRequest,
  submitTaskRequestReady,
} from "@/app/admin/task-requests/actions";

export type TaskRequestBannerData = {
  id: string;
  status: string;
  driveUrl: string;
  staffNote: string;
  adminNote: string;
};

type Props = {
  isAdmin: boolean;
  request: TaskRequestBannerData;
};

export function TaskRequestBanner({ isAdmin, request }: Props) {
  const { tr } = useUiStrings();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  function run(action: () => Promise<{ ok?: true; error?: string }>) {
    setError("");
    start(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  if (!["processing", "ready", "requested"].includes(request.status)) return null;

  return (
    <aside className="task-request-banner" role="status">
      <div className="task-request-banner-copy">
        <strong>
          {request.status === "processing"
            ? tr({ en: "Verification in processing", kn: "ಪರಿಶೀಲನೆ ಸಂಸ್ಕರಣೆಯಲ್ಲಿದೆ", hi: "सत्यापन प्रोसेसिंग में" })
            : request.status === "ready"
              ? tr({
                  en: "Ready for publish — publishing moves this to Completed",
                  kn: "ಪ್ರಕಟಣೆಗೆ ಸಿದ್ಧ — ಪ್ರಕಟಿಸಿದಾಗ ಪೂರ್ಣ ವಿಭಾಗಕ್ಕೆ ಹೋಗುತ್ತದೆ",
                  hi: "प्रकाशन के लिए तैयार — प्रकाशित होते ही पूर्ण में जाएगा",
                })
              : tr({ en: "Request waiting for review", kn: "ವಿನಂತಿ ಪರಿಶೀಲನೆಗಾಗಿ ಕಾಯುತ್ತಿದೆ", hi: "अनुरोध समीक्षा की प्रतीक्षा में" })}
        </strong>
        {request.adminNote ? <p>{request.adminNote}</p> : null}
        {request.staffNote && isAdmin ? (
          <p>
            {tr({ en: "Staff note", kn: "ಸಿಬ್ಬಂದಿ ಟಿಪ್ಪಣಿ", hi: "स्टाफ़ नोट" })}: {request.staffNote}
          </p>
        ) : null}
        {error ? <p role="alert">{error}</p> : null}
      </div>
      <div className="task-request-banner-actions">
        {request.driveUrl ? (
          <a
            className="button button-outline is-compact"
            href={request.driveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" />
            {tr({ en: "Open Drive", kn: "Drive ತೆರೆಯಿರಿ", hi: "Drive खोलें" })}
          </a>
        ) : null}
        {!isAdmin && request.status === "processing" ? (
          <button
            type="button"
            className="button is-compact"
            disabled={pending}
            onClick={() => run(() => submitTaskRequestReady({ id: request.id }))}
          >
            <Send size={15} aria-hidden="true" />
            {tr({ en: "Send to admin", kn: "ಆಡ್ಮಿನ್‌ಗೆ ಕಳುಹಿಸಿ", hi: "एडमिन को भेजें" })}
          </button>
        ) : null}
        {isAdmin && request.status === "ready" ? (
          <button
            type="button"
            className="button button-outline is-compact"
            disabled={pending}
            onClick={() => run(() => completeTaskRequest({ id: request.id }))}
          >
            <Check size={15} aria-hidden="true" />
            {tr({ en: "Mark done without publish", kn: "ಪ್ರಕಟಿಸದೆ ಮುಗಿಸಿ", hi: "बिना प्रकाशन पूर्ण" })}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
