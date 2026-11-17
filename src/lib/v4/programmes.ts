import { z } from "zod";

export const programmeCardKinds = ["programme", "social"] as const;

export const programmeCardSchema = z.object({
  id: z.string().min(1).max(64),
  href: z
    .string()
    .min(1)
    .max(200)
    .regex(/^\/[A-Za-z0-9\-/_]*$/),
  label_kn: z.string().min(1).max(160),
  label_en: z.string().min(1).max(160),
  label_hi: z.string().min(1).max(160),
  blurb_kn: z.string().max(220).default(""),
  blurb_en: z.string().max(220).default(""),
  blurb_hi: z.string().max(220).default(""),
  kind: z.enum(programmeCardKinds).default("programme"),
  enabled: z.boolean().default(true),
});

export type ProgrammeCard = z.infer<typeof programmeCardSchema>;

export const programmesHubSchema = z.object({
  cards: z.array(programmeCardSchema).max(24),
});

export type ProgrammesHubConfig = z.infer<typeof programmesHubSchema>;

/** Default hub cards — all channel shows plus social videos. */
export const defaultProgrammeCards: ProgrammeCard[] = [
  {
    id: "sadhakara-hejje",
    href: "/category/sadhakara-hejje",
    label_kn: "ಸಾಧಕರ ಹೆಜ್ಜೆ",
    label_en: "Footsteps of achievers",
    label_hi: "साधकों के पदचिह्न",
    blurb_kn: "ಸಾಧಕರ ಜೀವನ ಮತ್ತು ಸೇವೆಯ ಕಥೆಗಳು",
    blurb_en: "Stories of achievers and their service",
    blurb_hi: "साधकों और उनकी सेवा की कहानियाँ",
    kind: "programme",
    enabled: true,
  },
  {
    id: "hemmeya-shravakaru",
    href: "/category/hemmeya-shravakaru",
    label_kn: "ಹೆಮ್ಮೆಯ ಶ್ರಾವಕರು",
    label_en: "Proud shravakas",
    label_hi: "गौरवशाली श्रावक",
    blurb_kn: "ಸಮುದಾಯದ ಹೆಮ್ಮೆಯ ಶ್ರಾವಕರ ಪರಿಚಯ",
    blurb_en: "Profiles of community shravakas",
    blurb_hi: "समुदाय के गौरवशाली श्रावकों का परिचय",
    kind: "programme",
    enabled: true,
  },
  {
    id: "sahitigalondige-samvada",
    href: "/category/sahitigalondige-samvada",
    label_kn: "ಸಾಹಿತಿಗಳೊಂದಿಗೆ ಸಂವಾದ",
    label_en: "Conversations with writers",
    label_hi: "साहित्यकारों से संवाद",
    blurb_kn: "ಸಾಹಿತಿಗಳೊಂದಿಗೆ ಸಂವಾದ ಮತ್ತು ಸಂದರ್ಶನ",
    blurb_en: "Dialogues and interviews with writers",
    blurb_hi: "साहित्यकारों से संवाद और साक्षात्कार",
    kind: "programme",
    enabled: true,
  },
  {
    id: "kiru-parichaya",
    href: "/category/kiru-parichaya",
    label_kn: "ಕಿರು ಪರಿಚಯ",
    label_en: "Short profiles",
    label_hi: "संक्षिप्त परिचय",
    blurb_kn: "ವ್ಯಕ್ತಿ ಪರಿಚಯ ಮತ್ತು ಕಿರು ವಿವರಗಳು",
    blurb_en: "Short personal introductions",
    blurb_hi: "व्यक्ति परिचय और संक्षिप्त विवरण",
    kind: "programme",
    enabled: true,
  },
  {
    id: "jnana-deepike",
    href: "/category/jnana-deepike",
    label_kn: "ಜ್ಞಾನ ದೀಪಿಕೆ",
    label_en: "Jnana Deepike – writers",
    label_hi: "ज्ञान दीपिका – साहित्यकार",
    blurb_kn: "ಜೈನ ಸಾಹಿತಿಗಳ ಪರಿಚಯ",
    blurb_en: "Introducing Jain writers",
    blurb_hi: "जैन साहित्यकारों का परिचय",
    kind: "programme",
    enabled: true,
  },
  {
    id: "jnana-deevige",
    href: "/category/jnana-deevige",
    label_kn: "ಜ್ಞಾನ ದೀವಿಗೆ",
    label_en: "Jnana Deevige – books",
    label_hi: "ज्ञान दीविगे – पुस्तकें",
    blurb_kn: "ಜೈನ ಪುಸ್ತಕಗಳ ಪರಿಚಯ",
    blurb_en: "Introducing Jain books",
    blurb_hi: "जैन पुस्तकों का परिचय",
    kind: "programme",
    enabled: true,
  },
  {
    id: "dharmada-nudi",
    href: "/category/dharmada-nudi",
    label_kn: "ಧರ್ಮದ ನುಡಿ",
    label_en: "Words of dharma",
    label_hi: "धर्म के वचन",
    blurb_kn: "ಧರ್ಮದ ನುಡಿ ಮತ್ತು ಚಿಂತನೆ",
    blurb_en: "Dharma teachings and reflection",
    blurb_hi: "धर्म वचन और चिंतन",
    kind: "programme",
    enabled: true,
  },
  {
    id: "weekly-jain-news",
    href: "/category/weekly-jain-news",
    label_kn: "ವಾರದ ಜೈನ ಸುದ್ದಿಗಳು",
    label_en: "Weekly Jain news",
    label_hi: "साप्ताहिक जैन समाचार",
    blurb_kn: "ವಾರದ ಪ್ರಮುಖ ಜೈನ ಸುದ್ದಿಗಳು",
    blurb_en: "The week’s main Jain news",
    blurb_hi: "सप्ताह की मुख्य जैन खबरें",
    kind: "programme",
    enabled: true,
  },
  {
    id: "jain-habbagalu",
    href: "/category/jain-habbagalu",
    label_kn: "ಜೈನ ಹಬ್ಬಗಳು",
    label_en: "Jain festivals",
    label_hi: "जैन पर्व",
    blurb_kn: "ಹಬ್ಬಗಳು ಮತ್ತು ಪರ್ವಗಳ ವರದಿ",
    blurb_en: "Festival and parva coverage",
    blurb_hi: "पर्व और उत्सव की रिपोर्ट",
    kind: "programme",
    enabled: true,
  },
  {
    id: "jain-jeevana-shaili",
    href: "/category/jain-jeevana-shaili",
    label_kn: "ಜೈನ ಜೀವನ ಶೈಲಿ",
    label_en: "Jain way of life",
    label_hi: "जैन जीवन शैली",
    blurb_kn: "ಜಾತಿಯಲ್ಲ, ಜೀವನ ಶೈಲಿ — ಚರ್ಚೆ ಮತ್ತು ವರದಿ",
    blurb_en: "Jain as a way of life — stories and discussion",
    blurb_hi: "जाति नहीं, जीवन शैली — चर्चा और रिपोर्ट",
    kind: "programme",
    enabled: true,
  },
  {
    id: "chintana-manthana",
    href: "/category/chintana-manthana",
    label_kn: "ಚಿಂತನ–ಮಂಥನ",
    label_en: "Chintana–Manthana",
    label_hi: "चिंतन–मंथन",
    blurb_kn: "ಚಿಂತನೆ ಮತ್ತು ಸಂವಾದದ ಕಾರ್ಯಕ್ರಮ",
    blurb_en: "Reflection and discussion programmes",
    blurb_hi: "चिंतन और संवाद के कार्यक्रम",
    kind: "programme",
    enabled: true,
  },
  {
    id: "social-videos",
    href: "/category/social-videos",
    label_kn: "ಸಾಮಾಜಿಕ ಮಾಧ್ಯಮ ವಿಡಿಯೋಗಳು",
    label_en: "Social media videos",
    label_hi: "सोशल मीडिया वीडियो",
    blurb_kn: "YouTube, Facebook ಮತ್ತು Instagram ವಿಡಿಯೋಗಳು",
    blurb_en: "YouTube, Facebook and Instagram videos",
    blurb_hi: "YouTube, Facebook और Instagram वीडियो",
    kind: "social",
    enabled: true,
  },
  {
    id: "social-media",
    href: "/category/social-media",
    label_kn: "ಸಾಮಾಜಿಕ ಜಾಲತಾಣ",
    label_en: "Social media hub",
    label_hi: "सोशल मीडिया केंद्र",
    blurb_kn: "ಪೋಸ್ಟರ್‌ಗಳು ಮತ್ತು ವಿಡಿಯೋಗಳು ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ",
    blurb_en: "Posters and videos in one place",
    blurb_hi: "पोस्टर और वीडियो एक ही जगह",
    kind: "social",
    enabled: true,
  },
];

export const defaultProgrammesHub: ProgrammesHubConfig = {
  cards: defaultProgrammeCards,
};

export function parseProgrammesHub(value: unknown): ProgrammesHubConfig {
  const parsed = programmesHubSchema.safeParse(value);
  if (parsed.success && parsed.data.cards.length) return parsed.data;
  return defaultProgrammesHub;
}

export function enabledProgrammeCards(
  config: ProgrammesHubConfig = defaultProgrammesHub,
): ProgrammeCard[] {
  return config.cards.filter((card) => card.enabled);
}

export type ProgrammeCardSort = "menu" | "az" | "za";

export function sortProgrammeCards(
  cards: ProgrammeCard[],
  sort: ProgrammeCardSort,
  locale: "kn" | "en" | "hi",
): ProgrammeCard[] {
  if (sort === "menu") return cards;
  const label = (card: ProgrammeCard) =>
    locale === "en"
      ? card.label_en
      : locale === "hi"
        ? card.label_hi
        : card.label_kn;
  const ordered = [...cards].sort((a, b) =>
    label(a).localeCompare(label(b), locale, { sensitivity: "base" }),
  );
  return sort === "za" ? ordered.reverse() : ordered;
}
