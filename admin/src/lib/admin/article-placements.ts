import type { Tri } from "@/lib/i18n/strings";

/** Curated “Where to show” destinations in the article editor (category slugs). */
export const ARTICLE_PLACEMENTS: {
  slug: string;
  label: Tri;
  needsPlace?: boolean;
  needsMatha?: boolean;
}[] = [
  {
    slug: "state-jain-news",
    label: {
      en: "State Jain news",
      kn: "ರಾಜ್ಯ ಜೈನ ಸುದ್ದಿಗಳು",
      hi: "राज्य जैन समाचार",
    },
    needsPlace: true,
  },
  {
    slug: "jain-milan",
    label: {
      en: "Jain Milan news",
      kn: "ಜೈನ್ ಮಿಲನ್ ಸುದ್ದಿಗಳು",
      hi: "जैन मिलन समाचार",
    },
  },
  {
    slug: "kshetra-parichaya",
    label: {
      en: "Jain kshetras by district",
      kn: "ಜಿಲ್ಲೆಯ ಜೈನ ಕ್ಷೇತ್ರಗಳು",
      hi: "ज़िला अनुसार जैन क्षेत्र",
    },
    needsPlace: true,
  },
  {
    slug: "panchakalyana",
    label: { en: "Panchakalyana", kn: "ಪಂಚಕಲ್ಯಾಣ", hi: "पंचकल्याण" },
  },
  {
    slug: "jain-bhakti-geete",
    label: {
      en: "Jain devotional songs",
      kn: "ಜೈನ ಭಕ್ತಿಗೀತೆಗಳು",
      hi: "जैन भक्ति गीत",
    },
  },
  {
    slug: "jain-matha",
    label: { en: "Jain mathas", kn: "ಜೈನ ಮಠಗಳು", hi: "जैन मठ" },
    needsMatha: true,
  },
  {
    slug: "mahamastakabhisheka",
    label: {
      en: "Mahamastakabhisheka",
      kn: "ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ",
      hi: "महामस्तकाभिषेक",
    },
  },
  {
    slug: "jwalamala-programmes",
    label: {
      en: "Jwalamala News programmes",
      kn: "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್ ಕಾರ್ಯಕ್ರಮಗಳು",
      hi: "ज्वालामाल न्यूज़ कार्यक्रम",
    },
  },
  {
    slug: "social-media",
    label: { en: "Social media", kn: "ಸಾಮಾಜಿಕ ಜಾಲತಾಣ", hi: "सोशल मीडिया" },
  },
];
