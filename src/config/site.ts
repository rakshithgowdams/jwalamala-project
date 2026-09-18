export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "ಜ್ವಾಲಾಮಾಲಾ",
  fullName: process.env.NEXT_PUBLIC_SITE_FULL_NAME || "ಜ್ವಾಲಾಮಾಲಾ ನ್ಯೂಸ್",
  englishName: process.env.NEXT_PUBLIC_SITE_ENGLISH_NAME || "Jwalamala News",
  hindiName: process.env.NEXT_PUBLIC_SITE_HINDI_NAME || "ज्वालामाला न्यूज़",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "ಜೈನ ಸಮಾಜದ ಧ್ವನಿ. ಸುದ್ದಿ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ಸಮುದಾಯದ ನಂಬಿಕೆಯ ತಾಣ.",
  englishDescription:
    process.env.NEXT_PUBLIC_SITE_ENGLISH_DESCRIPTION ||
    "The voice of the Jain community. News, culture and community trust.",
  hindiDescription:
    process.env.NEXT_PUBLIC_SITE_HINDI_DESCRIPTION ||
    "जैन समाज की आवाज़। समाचार, संस्कृति और समुदाय का विश्वास।",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || "/images/jwalamala-logo.jpg",
  locale: "kn_IN",
  timeZone: "Asia/Kolkata",
  demo: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const;
