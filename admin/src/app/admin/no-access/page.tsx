import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { getUiStrings } from "@/lib/i18n/server";

export default async function NoAccess() {
  const { tr } = await getUiStrings();
  return (
    <>
      <h1>{tr({ en: "No access", kn: "ಪ್ರವೇಶವಿಲ್ಲ", hi: "पहुँच नहीं" })}</h1>
      <section className="utility-panel no-access">
        <ShieldAlert size={28} aria-hidden="true" />
        <p>
          {tr({
            en: "Your account does not have access to this part of the admin panel. Ask an administrator to add it under Staff & access.",
            kn: "ನಿಮ್ಮ ಖಾತೆಗೆ ನಿರ್ವಹಣಾ ಫಲಕದ ಈ ಭಾಗಕ್ಕೆ ಪ್ರವೇಶವಿಲ್ಲ. ಸಿಬ್ಬಂದಿ ಮತ್ತು ಪ್ರವೇಶದಲ್ಲಿ ಇದನ್ನು ಸೇರಿಸಲು ನಿರ್ವಾಹಕರಿಗೆ ತಿಳಿಸಿ.",
            hi: "आपके खाते को एडमिन पैनल के इस हिस्से की पहुँच नहीं है। स्टाफ़ और पहुँच में इसे जोड़ने के लिए एडमिन से कहें।",
          })}
        </p>
        <Link href="/admin" className="button button-outline">
          {tr({ en: "Back to dashboard", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂತಿರುಗಿ", hi: "डैशबोर्ड पर वापस जाएँ" })}
        </Link>
      </section>
    </>
  );
}
