import type { Tri } from "@/lib/i18n/strings";

/**
 * Every admin sidebar feature, the permission needed to open it, and what a
 * staff member is granted when an administrator gives them the feature.
 * Admin-only features can never be handed to staff accounts.
 */
export type Section = {
  key: string;
  label: Tri;
  /** Needed to open the page. */
  view: string;
  /** Granted to a staff account that is given this feature. */
  grants: string[];
  adminOnly?: boolean;
};
export type SectionGroup = { title: Tri; sections: Section[] };

const content = ["content.read", "content.edit"];

export const sectionGroups: SectionGroup[] = [
  {
    title: { en: "Overview", kn: "ಅವಲೋಕನ", hi: "अवलोकन" },
    sections: [
      { key: "", label: { en: "Dashboard", kn: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್", hi: "डैशबोर्ड" }, view: "admin.access", grants: [] },
      { key: "analytics", label: { en: "Analytics", kn: "ಓದುಗರ ಅಂಕಿಅಂಶ", hi: "एनालिटिक्स" }, view: "analytics.read", grants: ["analytics.read"] },
      { key: "audit", label: { en: "Audit history", kn: "ಬದಲಾವಣೆ ಇತಿಹಾಸ", hi: "ऑडिट इतिहास" }, view: "analytics.read", grants: ["analytics.read"] },
    ],
  },
  {
    title: { en: "Content", kn: "ವಿಷಯ", hi: "सामग्री" },
    sections: [
      { key: "posts", label: { en: "Articles", kn: "ಲೇಖನಗಳು", hi: "लेख" }, view: "content.read", grants: ["content.read", "content.create", "content.edit", "content.publish"] },
      {
        key: "tasks",
        label: { en: "Tasks", kn: "ಕಾರ್ಯಗಳು", hi: "कार्य" },
        view: "content.read",
        grants: ["content.read", "content.edit"],
      },
      {
        key: "chat",
        label: { en: "Chat", kn: "ಚಾಟ್", hi: "चैट" },
        view: "admin.access",
        grants: ["admin.access"],
      },
      { key: "desk", label: { en: "News desk", kn: "ಸುದ್ದಿ ವಿಭಾಗ", hi: "न्यूज़ डेस्क" }, view: "content.read", grants: content },
      { key: "categories", label: { en: "Categories", kn: "ವರ್ಗಗಳು", hi: "श्रेणियाँ" }, view: "content.edit", grants: content },
      { key: "mathas", label: { en: "Jain mathas", kn: "ಜೈನ ಮಠಗಳು", hi: "जैन मठ" }, view: "content.edit", grants: content },
      { key: "home", label: { en: "Home page layout", kn: "ಮುಖಪುಟ ವಿನ್ಯಾಸ", hi: "होम पेज लेआउट" }, view: "content.edit", grants: content },
      { key: "trending", label: { en: "Trending topics", kn: "ಈಗ ಚರ್ಚೆಯಲ್ಲಿ", hi: "ट्रेंडिंग विषय" }, view: "content.edit", grants: content },
      { key: "topics", label: { en: "Topic collections", kn: "ವಿಷಯ ಸಂಗ್ರಹ", hi: "विषय संग्रह" }, view: "content.edit", grants: content },
      { key: "tags", label: { en: "Tags", kn: "ಟ್ಯಾಗ್‌ಗಳು", hi: "टैग" }, view: "content.edit", grants: content },
      { key: "series", label: { en: "Video series", kn: "ವಿಡಿಯೋ ಸರಣಿಗಳು", hi: "वीडियो सीरीज़" }, view: "content.edit", grants: content },
      { key: "authors", label: { en: "Authors", kn: "ಲೇಖಕರು", hi: "लेखक" }, view: "content.edit", grants: content },
      { key: "live-blogs", label: { en: "Live blogs", kn: "ನೇರ ವರದಿಗಳು", hi: "लाइव ब्लॉग" }, view: "content.edit", grants: content },
      { key: "galleries", label: { en: "Photo galleries", kn: "ಚಿತ್ರ ಸಂಗ್ರಹ", hi: "फ़ोटो गैलरी" }, view: "content.edit", grants: content },
      { key: "web-stories", label: { en: "Web stories", kn: "ಚಿತ್ರಕಥೆಗಳು", hi: "वेब स्टोरीज़" }, view: "content.edit", grants: content },
      { key: "polls", label: { en: "Polls", kn: "ಸಮೀಕ್ಷೆಗಳು", hi: "पोल" }, view: "content.edit", grants: content },
      { key: "quizzes", label: { en: "Quizzes", kn: "ರಸಪ್ರಶ್ನೆಗಳು", hi: "क्विज़" }, view: "content.edit", grants: content },
      { key: "import", label: { en: "CSV import", kn: "CSV ಆಮದು", hi: "CSV आयात" }, view: "content.edit", grants: content },
    ],
  },
  {
    title: { en: "Events & places", kn: "ಕಾರ್ಯಕ್ರಮ ಮತ್ತು ಊರುಗಳು", hi: "कार्यक्रम और स्थान" },
    sections: [
      { key: "events", label: { en: "Events", kn: "ಕಾರ್ಯಕ್ರಮಗಳು", hi: "कार्यक्रम" }, view: "content.edit", grants: content },
      { key: "places", label: { en: "Districts & places", kn: "ಜಿಲ್ಲೆ ಮತ್ತು ಊರುಗಳು", hi: "ज़िले और स्थान" }, view: "content.edit", grants: content },
      { key: "basadis", label: { en: "Basadis", kn: "ಬಸದಿಗಳು", hi: "बसदियाँ" }, view: "community.manage", grants: ["community.manage"] },
      { key: "jain-calendar", label: { en: "Jain calendar", kn: "ಜೈನ ಪಂಚಾಂಗ", hi: "जैन पंचांग" }, view: "content.edit", grants: content },
      { key: "jain-times", label: { en: "Jain time rules", kn: "ಜೈನ ಸಮಯದ ನಿಯಮಗಳು", hi: "जैन समय नियम" }, view: "settings.manage", grants: ["settings.manage"] },
    ],
  },
  {
    title: { en: "Community", kn: "ಸಮುದಾಯ", hi: "समुदाय" },
    sections: [
      { key: "submissions", label: { en: "Reader submissions", kn: "ಸಲ್ಲಿಕೆಗಳು", hi: "पाठकों की प्रविष्टियाँ" }, view: "community.manage", grants: ["community.manage"] },
      { key: "moderation", label: { en: "Moderation", kn: "ಪ್ರಕಟಣೆಯ ಪರಿಶೀಲನೆ", hi: "मॉडरेशन" }, view: "community.manage", grants: ["community.manage"] },
      { key: "comments", label: { en: "Comments", kn: "ಅಭಿಪ್ರಾಯಗಳು", hi: "टिप्पणियाँ" }, view: "community.manage", grants: ["community.manage"] },
      { key: "notices", label: { en: "Community notices", kn: "ಸಮುದಾಯ ಪ್ರಕಟಣೆ", hi: "सामुदायिक सूचनाएँ" }, view: "community.manage", grants: ["community.manage"] },
      { key: "notice-billing", label: { en: "Paid notices", kn: "ಪಾವತಿ ಪ್ರಕಟಣೆಗಳು", hi: "सशुल्क सूचनाएँ" }, view: "ads.manage", grants: ["ads.manage"] },
      { key: "opportunities", label: { en: "Opportunities", kn: "ಅವಕಾಶಗಳು", hi: "अवसर" }, view: "community.manage", grants: ["community.manage"] },
      { key: "contributors", label: { en: "Contributor applications", kn: "ವರದಿಗಾರರ ಅರ್ಜಿಗಳು", hi: "योगदानकर्ता आवेदन" }, view: "users.manage", grants: ["users.manage"] },
    ],
  },
  {
    title: { en: "Ads & revenue", kn: "ಜಾಹೀರಾತು ಮತ್ತು ಆದಾಯ", hi: "विज्ञापन और आय" },
    sections: [
      { key: "ads", label: { en: "Ads", kn: "ಜಾಹೀರಾತು", hi: "विज्ञापन" }, view: "ads.manage", grants: ["ads.manage"] },
      { key: "posters", label: { en: "Poster & banner ads", kn: "ಪೋಸ್ಟರ್/ಬ್ಯಾನರ್ ಜಾಹೀರಾತು", hi: "पोस्टर और बैनर विज्ञापन" }, view: "ads.manage", grants: ["ads.manage"] },
      { key: "business-ads", label: { en: "Local shop ads", kn: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು", hi: "स्थानीय दुकान विज्ञापन" }, view: "ads.manage", grants: ["ads.manage"] },
      { key: "ad-settings", label: { en: "Ad slots", kn: "ಜಾಹೀರಾತು ಸ್ಥಾನಗಳು", hi: "विज्ञापन स्थान" }, view: "ads.manage", grants: ["ads.manage"] },
      { key: "support", label: { en: "Support & membership", kn: "ಬೆಂಬಲ ಮತ್ತು ಸದಸ್ಯತ್ವ", hi: "सहयोग और सदस्यता" }, view: "settings.manage", grants: ["settings.manage"] },
    ],
  },
  {
    title: { en: "Distribution", kn: "ಹಂಚಿಕೆ", hi: "वितरण" },
    sections: [
      { key: "social", label: { en: "Social media", kn: "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ", hi: "सोशल मीडिया" }, view: "social.manage", grants: ["social.manage"] },
      { key: "newsletter", label: { en: "Newsletter", kn: "ಸುದ್ದಿ ಸಂಚಿಕೆ", hi: "न्यूज़लेटर" }, view: "newsletter.manage", grants: ["newsletter.manage"] },
      { key: "distribution-schedule", label: { en: "Bulletin schedule", kn: "ಬುಲೆಟಿನ್ ವೇಳಾಪಟ್ಟಿ", hi: "बुलेटिन शेड्यूल" }, view: "settings.manage", grants: ["settings.manage"] },
      { key: "push", label: { en: "Push notifications", kn: "ಅಧಿಸೂಚನೆಗಳು", hi: "पुश सूचनाएँ" }, view: "content.publish", grants: ["content.read", "content.publish"] },
    ],
  },
  {
    title: { en: "Data", kn: "ದತ್ತಾಂಶ", hi: "डेटा" },
    sections: [
      { key: "weather", label: { en: "Weather", kn: "ಹವಾಮಾನ", hi: "मौसम" }, view: "settings.manage", grants: ["settings.manage"] },
      { key: "reservoirs", label: { en: "Reservoir levels", kn: "ಜಲಾಶಯಗಳ ನೀರಿನ ಮಟ್ಟ", hi: "जलाशय स्तर" }, view: "content.edit", grants: content },
      { key: "rates", label: { en: "Market rates", kn: "ಇಂದಿನ ದರಗಳು", hi: "आज के भाव" }, view: "content.edit", grants: content },
      { key: "utility-import", label: { en: "Utility CSV import", kn: "ಉಪಯುಕ್ತ CSV ಆಮದು", hi: "यूटिलिटी CSV आयात" }, view: "content.edit", grants: content },
    ],
  },
  {
    title: { en: "Settings", kn: "ಸೆಟ್ಟಿಂಗ್ಸ್", hi: "सेटिंग्स" },
    sections: [
      { key: "staff", label: { en: "Staff & access", kn: "ಸಿಬ್ಬಂದಿ ಮತ್ತು ಪ್ರವೇಶ", hi: "स्टाफ़ और पहुँच" }, view: "users.manage", grants: [], adminOnly: true },
      { key: "users", label: { en: "Users", kn: "ಬಳಕೆದಾರರು", hi: "उपयोगकर्ता" }, view: "users.manage", grants: [], adminOnly: true },
      { key: "roles", label: { en: "Roles & permissions", kn: "ಪಾತ್ರಗಳು ಮತ್ತು ಅನುಮತಿಗಳು", hi: "भूमिकाएँ और अनुमतियाँ" }, view: "users.manage", grants: [], adminOnly: true },
      { key: "providers", label: { en: "Service providers", kn: "ಸೇವಾ ಸೆಟ್ಟಿಂಗ್‌ಗಳು", hi: "सेवा प्रदाता" }, view: "settings.manage", grants: ["settings.manage"] },
      { key: "jobs", label: { en: "Background jobs", kn: "ಹಿನ್ನೆಲೆ ಕಾರ್ಯಗಳು", hi: "बैकग्राउंड जॉब्स" }, view: "settings.manage", grants: ["settings.manage"] },
      { key: "redirects", label: { en: "301 redirects", kn: "301 ಮರುನಿರ್ದೇಶನಗಳು", hi: "301 रीडायरेक्ट" }, view: "settings.manage", grants: [], adminOnly: true },
      { key: "settings", label: { en: "Site settings", kn: "ತಾಣದ ಸೆಟ್ಟಿಂಗ್ಸ್", hi: "साइट सेटिंग्स" }, view: "settings.manage", grants: ["settings.manage"], adminOnly: true },
    ],
  },
];

export const allSections = sectionGroups.flatMap((group) => group.sections);
const byKey = new Map(allSections.map((section) => [section.key, section]));

/** Features an administrator may hand to a staff account. */
export const grantableKeys = allSections.filter((s) => s.key && !s.adminOnly).map((s) => s.key);

/** Database permissions a staff account holds for the given features. */
export function permissionsFor(keys: string[]) {
  const granted = new Set(["admin.access"]);
  for (const key of keys) {
    const section = byKey.get(key);
    if (section && !section.adminOnly) section.grants.forEach((p) => granted.add(p));
  }
  return [...granted].sort();
}

/** v4 table names and short URLs that open a sidebar feature under another key. */
const aliases: Record<string, string> = {
  ad_campaigns: "ads",
  business_ads: "business-ads",
  trending_items: "trending",
  jain_calendar_days: "jain-calendar",
  liveblogs: "live-blogs",
  web_stories: "web-stories",
  reservoir_readings: "reservoirs",
  market_rates: "rates",
};

/** The sidebar feature an /admin path belongs to, or null for an unknown page. */
export function sectionForPath(pathname: string): string | null {
  const parts = pathname.replace(/^\/admin\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return "";
  const raw = parts[0] === "v4" ? parts[1] || "" : parts[0];
  const key = aliases[raw] ?? raw;
  return byKey.has(key) ? key : null;
}
