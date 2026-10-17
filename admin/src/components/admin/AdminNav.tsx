"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useUiStrings } from "@/components/i18n/LanguageProvider";
import type { Tri } from "@/lib/i18n/strings";

const groups: { title: Tri; links: [string, Tri][] }[] = [
  {
    title: { en: "Overview", kn: "ಅವಲೋಕನ", hi: "अवलोकन" },
    links: [
      ["", { en: "Dashboard", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", hi: "डैशबोर्ड" }],
      ["analytics", { en: "Analytics", kn: "ಓದುಗರ ಅಂಕಿಅಂಶ", hi: "एनालिटिक्स" }],
      ["audit", { en: "Audit history", kn: "ಬದಲಾವಣೆ ಇತಿಹಾಸ", hi: "ऑडिट इतिहास" }],
    ],
  },
  {
    title: { en: "Content", kn: "ವಿಷಯ", hi: "सामग्री" },
    links: [
      ["posts", { en: "Articles", kn: "ಲೇಖನಗಳು", hi: "लेख" }],
      ["desk", { en: "News desk", kn: "ಸುದ್ದಿ ವಿಭಾಗ", hi: "न्यूज़ डेस्क" }],
      ["categories", { en: "Categories", kn: "ವರ್ಗಗಳು", hi: "श्रेणियाँ" }],
      ["home", { en: "Home page layout", kn: "ಮುಖಪುಟ ವಿನ್ಯಾಸ", hi: "होम पेज लेआउट" }],
      ["trending", { en: "Trending topics", kn: "ಈಗ ಚರ್ಚೆಯಲ್ಲಿ", hi: "ट्रेंडिंग विषय" }],
      ["topics", { en: "Topic collections", kn: "ವಿಷಯ ಸಂಗ್ರಹ", hi: "विषय संग्रह" }],
      ["tags", { en: "Tags", kn: "ಟ್ಯಾಗ್‌ಗಳು", hi: "टैग" }],
      ["series", { en: "Video series", kn: "ವಿಡಿಯೋ ಸರಣಿಗಳು", hi: "वीडियो सीरीज़" }],
      ["authors", { en: "Authors", kn: "ಲೇಖಕರು", hi: "लेखक" }],
      ["live-blogs", { en: "Live blogs", kn: "ನೇರ ವರದಿಗಳು", hi: "लाइव ब्लॉग" }],
      ["galleries", { en: "Photo galleries", kn: "ಚಿತ್ರ ಸಂಗ್ರಹ", hi: "फ़ोटो गैलरी" }],
      ["web-stories", { en: "Web stories", kn: "ಚಿತ್ರಕಥೆಗಳು", hi: "वेब स्टोरीज़" }],
      ["polls", { en: "Polls", kn: "ಸಮೀಕ್ಷೆಗಳು", hi: "पोल" }],
      ["quizzes", { en: "Quizzes", kn: "ರಸಪ್ರಶ್ನೆಗಳು", hi: "क्विज़" }],
      ["import", { en: "CSV import", kn: "CSV ಆಮದು", hi: "CSV आयात" }],
    ],
  },
  {
    title: { en: "Events & places", kn: "ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಊರುಗಳು", hi: "कार्यक्रम और स्थान" },
    links: [
      ["events", { en: "Events", kn: "ಕಾರ್ಯಕ್ರಮಗಳು", hi: "कार्यक्रम" }],
      ["places", { en: "Districts & places", kn: "ಜಿಲ್ಲೆ ಮತ್ತು ಊರುಗಳು", hi: "ज़िले और स्थान" }],
      ["basadis", { en: "Basadis", kn: "ಬಸದಿಗಳು", hi: "बसदियाँ" }],
      ["jain-calendar", { en: "Jain calendar", kn: "ಜೈನ ಪಂಚಾಂಗ", hi: "जैन पंचांग" }],
      ["jain-times", { en: "Jain time rules", kn: "ಜೈನ ಸಮಯದ ನಿಯಮಗಳು", hi: "जैन समय नियम" }],
    ],
  },
  {
    title: { en: "Community", kn: "ಸಮುದಾಯ", hi: "समुदाय" },
    links: [
      ["submissions", { en: "Reader submissions", kn: "ಸಲ್ಲಿಕೆಗಳು", hi: "पाठकों की प्रविष्टियाँ" }],
      ["moderation", { en: "Moderation", kn: "ಪ್ರಕಟಣೆಯ ಪರಿಶೀಲನೆ", hi: "मॉडरेशन" }],
      ["comments", { en: "Comments", kn: "ಅಭಿಪ್ರಾಯಗಳು", hi: "टिप्पणियाँ" }],
      ["notices", { en: "Community notices", kn: "ಸಮುದಾಯ ಪ್ರಕಟಣೆ", hi: "सामुदायिक सूचनाएँ" }],
      ["notice-billing", { en: "Paid notices", kn: "ಪಾವತಿ ಪ್ರಕಟಣೆಗಳು", hi: "सशुल्क सूचनाएँ" }],
      ["opportunities", { en: "Opportunities", kn: "ಅವಕಾಶಗಳು", hi: "अवसर" }],
      ["contributors", { en: "Contributor applications", kn: "ವರದಿಗಾರರ ಅರ್ಜಿಗಳು", hi: "योगदानकर्ता आवेदन" }],
    ],
  },
  {
    title: { en: "Ads & revenue", kn: "ಜಾಹೀರಾತು ಮತ್ತು ಆದಾಯ", hi: "विज्ञापन और आय" },
    links: [
      ["ads", { en: "Ads", kn: "ಜಾಹೀರಾತು", hi: "विज्ञापन" }],
      ["posters", { en: "Poster & banner ads", kn: "ಪೋಸ್ಟರ್/ಬ್ಯಾನರ್ ಜಾಹೀರಾತು", hi: "पोस्टर और बैनर विज्ञापन" }],
      ["business-ads", { en: "Local shop ads", kn: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು", hi: "स्थानीय दुकान विज्ञापन" }],
      ["ad-settings", { en: "Ad slots", kn: "ಜಾಹೀರಾತು ಸ್ಥಾನಗಳು", hi: "विज्ञापन स्थान" }],
      ["support", { en: "Support & membership", kn: "ಬೆಂಬಲ ಮತ್ತು ಸದಸ್ಯತ್ವ", hi: "सहयोग और सदस्यता" }],
    ],
  },
  {
    title: { en: "Distribution", kn: "ಹಂಚಿಕೆ", hi: "वितरण" },
    links: [
      ["social", { en: "Social media", kn: "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ", hi: "सोशल मीडिया" }],
      ["newsletter", { en: "Newsletter", kn: "ಸುದ್ದಿ ಸಂಚಿಕೆ", hi: "न्यूज़लेटर" }],
      ["distribution-schedule", { en: "Bulletin schedule", kn: "ಬುಲೆಟಿನ್ ವೇಳಾಪಟ್ಟಿ", hi: "बुलेटिन शेड्यूल" }],
      ["push", { en: "Push notifications", kn: "ಅಧಿಸೂಚನೆಗಳು", hi: "पुश सूचनाएँ" }],
    ],
  },
  {
    title: { en: "Data", kn: "ದತ್ತಾಂಶ", hi: "डेटा" },
    links: [
      ["weather", { en: "Weather", kn: "ಹವಾಮಾನ", hi: "मौसम" }],
      ["reservoirs", { en: "Reservoir levels", kn: "ಜಲಾಶಯಗಳ ನೀರಿನ ಮಟ್ಟ", hi: "जलाशय स्तर" }],
      ["rates", { en: "Market rates", kn: "ಇಂದಿನ ದರಗಳು", hi: "आज के भाव" }],
      ["utility-import", { en: "Utility CSV import", kn: "ಉಪಯುಕ್ತ CSV ಆಮದು", hi: "यूटिलिटी CSV आयात" }],
    ],
  },
  {
    title: { en: "Settings", kn: "ಸೆಟ್ಟಿಂಗ್ಸ್", hi: "सेटिंग्स" },
    links: [
      ["users", { en: "Users", kn: "ಬಳಕೆದಾರರು", hi: "उपयोगकर्ता" }],
      ["roles", { en: "Roles & permissions", kn: "ಪಾತ್ರಗಳು ಮತ್ತು ಅನುಮತಿಗಳು", hi: "भूमिकाएँ और अनुमतियाँ" }],
      ["providers", { en: "Service providers", kn: "ಸೇವಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು", hi: "सेवा प्रदाता" }],
      ["jobs", { en: "Background jobs", kn: "ಹಿನ್ನೆಲೆ ಕಾರ್ಯಗಳು", hi: "बैकग्राउंड जॉब्स" }],
      ["redirects", { en: "301 redirects", kn: "301 ಮರುನಿರ್ದೇಶನಗಳು", hi: "301 रीडायरेक्ट" }],
      ["settings", { en: "Site settings", kn: "ತಾಣದ ಸೆಟ್ಟಿಂಗ್ಸ್", hi: "साइट सेटिंग्स" }],
    ],
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const { tr } = useUiStrings();
  const [open, setOpen] = useState(false);
  const isCurrent = (path: string) =>
    path
      ? pathname === "/admin/" + path || pathname.startsWith("/admin/" + path + "/")
      : pathname === "/admin";
  return (
    <nav
      className={"admin-nav" + (open ? " is-open" : "")}
      aria-label={tr({ en: "Admin sections", kn: "ನಿರ್ವಹಣಾ ವಿಭಾಗಗಳು", hi: "एडमिन अनुभाग" })}
    >
      <button
        type="button"
        className="admin-nav-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
        {tr({ en: "Menu", kn: "ಮೆನು", hi: "मेनू" })}
      </button>
      <div className="admin-nav-groups">
        {groups.map((group) => (
          <div className="admin-nav-group" key={group.title.en}>
            <p>{tr(group.title)}</p>
            {group.links.map(([path, title]) => (
              <Link
                href={"/admin" + (path ? "/" + path : "")}
                key={path}
                prefetch={false}
                aria-current={isCurrent(path) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                {tr(title)}
              </Link>
            ))}
          </div>
        ))}
      </div>
    </nav>
  );
}
