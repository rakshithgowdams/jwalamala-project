"use client";
import { useState } from "react";
import { saveNoticeBilling } from "@/app/admin/notice-billing/actions";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
export function NoticeBilling({
  notices,
}: {
  notices: { id: string; title_kn: string }[];
}) {
  const { tr } = useUiStrings();
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="form-grid"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await saveNoticeBilling(
            Object.fromEntries(new FormData(e.currentTarget)),
          );
          setMessage(
            r.error ||
              tr({
                en: "Billing saved. Editorial approval remains separate.",
                kn: "ಬಿಲ್ಲಿಂಗ್ ಉಳಿಸಲಾಗಿದೆ. ಸಂಪಾದಕೀಯ ಅನುಮೋದನೆ ಪ್ರತ್ಯೇಕವಾಗಿಯೇ ಉಳಿಯುತ್ತದೆ.",
                hi: "बिलिंग सहेजी गई। संपादकीय अनुमोदन अलग से ही होगा।",
              }),
          );
        } catch {
          setMessage(
            tr({
              en: "Could not save billing.",
              kn: "ಬಿಲ್ಲಿಂಗ್ ಉಳಿಸಲಾಗಲಿಲ್ಲ.",
              hi: "बिलिंग सहेजी नहीं जा सकी।",
            }),
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field wide">
        {tr({ en: "Notice", kn: "ಪ್ರಕಟಣೆ", hi: "सूचना" })}
        <select name="notice_id" required>
          {notices.map((n) => (
            <option key={n.id} value={n.id}>
              {n.title_kn}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {tr({
          en: "Amount (INR)",
          kn: "ಮೊತ್ತ (ರೂ.)",
          hi: "राशि (रु.)",
        })}
        <input
          name="amount"
          type="number"
          min="1"
          max="1000000"
          step="0.01"
          required
        />
      </label>
      <label className="field wide">
        {tr({
          en: "Razorpay payment link",
          kn: "Razorpay ಪಾವತಿ ಲಿಂಕ್",
          hi: "Razorpay भुगतान लिंक",
        })}
        <input name="payment_url" type="url" required />
      </label>
      <label className="field">
        {tr({
          en: "Payment review",
          kn: "ಪಾವತಿ ಪರಿಶೀಲನೆ",
          hi: "भुगतान समीक्षा",
        })}
        <select name="status">
          <option value="pending">
            {tr({
              en: "Awaiting payment",
              kn: "ಪಾವತಿಗಾಗಿ ಕಾಯಲಾಗುತ್ತಿದೆ",
              hi: "भुगतान की प्रतीक्षा",
            })}
          </option>
          <option value="paid">
            {tr({
              en: "Verified paid",
              kn: "ಪಾವತಿ ಪರಿಶೀಲಿಸಲಾಗಿದೆ",
              hi: "भुगतान सत्यापित",
            })}
          </option>
          <option value="waived">
            {tr({
              en: "Fee waived",
              kn: "ಶುಲ್ಕ ಮನ್ನಾ",
              hi: "शुल्क माफ़",
            })}
          </option>
        </select>
      </label>
      <label className="field">
        {tr({
          en: "Provider payment reference",
          kn: "ಪಾವತಿ ಸೇವಾದಾರರ ಉಲ್ಲೇಖ ಸಂಖ್ಯೆ",
          hi: "भुगतान प्रदाता का संदर्भ",
        })}
        <input name="payment_reference" maxLength={200} />
      </label>
      <p className="notice wide">
        {tr({
          en: "Verify payment in your provider dashboard before marking paid. Send the payment link to the submitter through your usual contact channel.",
          kn: "ಪಾವತಿಯಾಗಿದೆ ಎಂದು ಗುರುತಿಸುವ ಮೊದಲು ನಿಮ್ಮ ಸೇವಾದಾರರ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿ ಪಾವತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಪಾವತಿ ಲಿಂಕ್ ಅನ್ನು ನಿಮ್ಮ ಸಾಮಾನ್ಯ ಸಂಪರ್ಕ ಮಾರ್ಗದ ಮೂಲಕ ಸಲ್ಲಿಸಿದವರಿಗೆ ಕಳುಹಿಸಿ.",
          hi: "भुगतान हो गया चिह्नित करने से पहले अपने प्रदाता के डैशबोर्ड में भुगतान की पुष्टि करें। भुगतान लिंक अपने सामान्य संपर्क माध्यम से भेजने वाले को भेजें।",
        })}
      </p>
      <button className="button button-ember" disabled={busy}>
        {tr({
          en: "Save billing",
          kn: "ಬಿಲ್ಲಿಂಗ್ ಉಳಿಸಿ",
          hi: "बिलिंग सहेजें",
        })}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
