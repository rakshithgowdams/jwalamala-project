import type { Locale } from "@/lib/i18n/strings";

export type NavLabel = { kn: string; en: string; hi: string };
export type NavLink = NavLabel & { href: string };
/** "districts" is filled from the live district list rather than written out here. */
export type NavSection = NavLink & {
  key: string;
  children?: NavLink[] | "districts";
};

export const navLabel = (locale: Locale, label: NavLabel) => label[locale];

const category = (
  slug: string,
  kn: string,
  en: string,
  hi: string,
): NavLink => ({
  href: "/category/" + slug,
  kn,
  en,
  hi,
});

/**
 * The publisher's main menu, in its order. Every other destination lives in the
 * hamburger, which leaves out anything already reachable from here.
 */
export const mainNavigation: NavSection[] = [
  { key: "home", href: "/", kn: "ಮುಖಪುಟ", en: "Home", hi: "होम" },
  {
    key: "latest",
    href: "/news",
    kn: "ಇತ್ತೀಚಿನ ಸುದ್ದಿ",
    en: "Latest news",
    hi: "ताज़ा समाचार",
    children: [
      category(
        "state-jain-news",
        "ರಾಜ್ಯ ಜೈನ ಸುದ್ದಿಗಳು",
        "State Jain news",
        "राज्य जैन समाचार",
      ),
      category(
        "jain-milan",
        "ಜೈನ್ ಮಿಲನ್ ಸುದ್ದಿಗಳು",
        "Jain Milan news",
        "जैन मिलन समाचार",
      ),
      category(
        "other-state-news",
        "ಹೊರ ರಾಜ್ಯ ಸುದ್ದಿಗಳು",
        "News from other states",
        "अन्य राज्यों के समाचार",
      ),
      {
        href: "/events",
        kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳು",
        en: "Upcoming events",
        hi: "आगामी कार्यक्रम",
      },
    ],
  },
  {
    key: "districts",
    href: "/districts",
    kn: "ಜಿಲ್ಲಾವಾರು ಜೈನ ಕ್ಷೇತ್ರ ಪರಿಚಯ",
    en: "Jain kshetras by district",
    hi: "ज़िलेवार जैन क्षेत्र परिचय",
    children: "districts",
  },
  {
    key: "panchakalyana",
    ...category(
      "panchakalyana",
      "ಪಂಚಕಲ್ಯಾಣಗಳು",
      "Panchakalyanas",
      "पंचकल्याणक",
    ),
  },
  {
    key: "bhakti",
    ...category(
      "jain-bhakti-geete",
      "ಜೈನ ಭಕ್ತಿಗೀತೆಗಳು",
      "Jain devotional songs",
      "जैन भक्ति गीत",
    ),
  },
  {
    key: "matha",
    ...category("jain-matha", "ಜೈನ ಮಠಗಳು", "Jain mathas", "जैन मठ"),
  },
  {
    key: "mahamastakabhisheka",
    ...category(
      "mahamastakabhisheka",
      "ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ",
      "Mahamastakabhisheka",
      "महामस्तकाभिषेक",
    ),
  },
  {
    key: "useful",
    ...category(
      "useful-information",
      "ಉಪಯುಕ್ತ ಮಾಹಿತಿ",
      "Useful information",
      "उपयोगी जानकारी",
    ),
  },
  {
    key: "jobs",
    href: "/opportunities",
    kn: "ಉದ್ಯೋಗಾವಕಾಶ",
    en: "Job opportunities",
    hi: "रोज़गार के अवसर",
  },
  {
    key: "programmes",
    ...category(
      "jwalamala-programmes",
      "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ ಸುದ್ದಿ ವಾಹಿನಿ ಕಾರ್ಯಕ್ರಮಗಳು",
      "Jwalamala News programmes",
      "ज्वालामाल न्यूज़ कार्यक्रम",
    ),
    children: [
      category(
        "sadhakara-hejje",
        "ಜ್ವಾಲಾಮಾಲ ಸಾಧಕರ ಹೆಜ್ಜೆ",
        "Footsteps of achievers",
        "साधकों के पदचिह्न",
      ),
      category(
        "hemmeya-shravakaru",
        "ಜ್ವಾಲಾಮಾಲ ಹೆಮ್ಮೆಯ ಶ್ರಾವಕರು",
        "Proud shravakas",
        "गौरवशाली श्रावक",
      ),
      category(
        "jnana-deepike",
        "ಜ್ವಾಲಾಮಾಲ ಜ್ಞಾನ ದೀಪಿಕೆ – ಜೈನ ಸಾಹಿತಿಗಳ ಪರಿಚಯ",
        "Jnana Deepike – Jain writers",
        "ज्ञान दीपिका – जैन साहित्यकार",
      ),
      category(
        "jnana-deevige",
        "ಜ್ವಾಲಾಮಾಲ ಜ್ಞಾನ ದೀವಿಗೆ – ಜೈನ ಪುಸ್ತಕಗಳ ಪರಿಚಯ",
        "Jnana Deevige – Jain books",
        "ज्ञान दीविगे – जैन पुस्तकें",
      ),
      category(
        "dharmada-nudi",
        "ಜ್ವಾಲಾಮಾಲ ಧರ್ಮದ ನುಡಿ",
        "Words of dharma",
        "धर्म के वचन",
      ),
      category(
        "weekly-jain-news",
        "ಜ್ವಾಲಾಮಾಲ ವಾರದ ಜೈನ ಸುದ್ದಿಗಳು",
        "Weekly Jain news",
        "साप्ताहिक जैन समाचार",
      ),
      category(
        "jain-habbagalu",
        "ಜ್ವಾಲಾಮಾಲ ಜೈನ ಹಬ್ಬಗಳು",
        "Jain festivals",
        "जैन पर्व",
      ),
      category(
        "jain-jeevana-shaili",
        "ಜ್ವಾಲಾಮಾಲ ಜೈನ – ಜಾತಿಯಲ್ಲ, ಜೀವನ ಶೈಲಿ",
        "Jain – not a caste, a way of life",
        "जैन – जाति नहीं, जीवन शैली",
      ),
      category(
        "chintana-manthana",
        "ಜ್ವಾಲಾಮಾಲ ಚಿಂತನ–ಮಂಥನ",
        "Chintana–Manthana",
        "चिंतन–मंथन",
      ),
    ],
  },
  {
    key: "contact",
    href: "/contact",
    kn: "ಸಂಪರ್ಕಿಸಿ",
    en: "Contact",
    hi: "संपर्क",
  },
];

/** Every destination the main menu already reaches, so the hamburger can skip it. */
export const mainNavigationHrefs = new Set(
  mainNavigation.flatMap((section) => [
    section.href,
    ...(Array.isArray(section.children)
      ? section.children.map((child) => child.href)
      : []),
  ]),
);

/** Categories the main menu needs, with the programme shows filed under their parent. */
export const mainNavigationCategories = mainNavigation.flatMap((section) => {
  const own = section.href.startsWith("/category/")
    ? [{ ...section, parent: null as string | null }]
    : [];
  const children = Array.isArray(section.children)
    ? section.children
        .filter((child) => child.href.startsWith("/category/"))
        .map((child) => ({
          ...child,
          parent: own.length ? section.href : null,
        }))
    : [];
  return [...own, ...children].map(({ href, kn, en, hi, parent }) => ({
    slug: href.slice("/category/".length),
    name_kn: kn,
    name_en: en,
    name_hi: hi,
    parent: parent ? parent.slice("/category/".length) : null,
  }));
});
