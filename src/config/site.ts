export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "ಜ್ವಾಲಾಮಾಲ",
  fullName: process.env.NEXT_PUBLIC_SITE_FULL_NAME || "ಜ್ವಾಲಾಮಾಲ ನ್ಯೂಸ್",
  englishName: process.env.NEXT_PUBLIC_SITE_ENGLISH_NAME || "Jwalamala News",
  hindiName: process.env.NEXT_PUBLIC_SITE_HINDI_NAME || "ज्वालामाल न्यूज़",
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    "ಜೈನ ಸಮಾಜದ ಧ್ವನಿ. ಸುದ್ದಿ, ಸಂಸ್ಕೃತಿ ಮತ್ತು ಸಮುದಾಯದ ನಂಬಿಕೆಯ ತಾಣ.",
  englishDescription:
    process.env.NEXT_PUBLIC_SITE_ENGLISH_DESCRIPTION ||
    "The voice of the Jain community. News, culture and community trust.",
  hindiDescription:
    process.env.NEXT_PUBLIC_SITE_HINDI_DESCRIPTION ||
    "जैन समाज की आवाज़। समाचार, संस्कृति और समुदाय का विश्वास।",
  // Absolute URLs reach readers through metadata, sitemaps, RSS and email, so a
  // localhost fallback in production silently publishes unreachable links. The
  // NODE_ENV check is inlined identically on both sides of the render, unlike a
  // server-only Vercel variable, which would differ once a client component
  // reads this. Set NEXT_PUBLIC_SITE_URL to override for a custom domain.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://jwalamala-project.vercel.app"
      : "http://localhost:3000"),
  logo: process.env.NEXT_PUBLIC_SITE_LOGO || "/images/jwalamala-logo.jpg",
  locale: "kn_IN",
  timeZone: "Asia/Kolkata",
  demo: process.env.NEXT_PUBLIC_DEMO_MODE === "true",
} as const;
