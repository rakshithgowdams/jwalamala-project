import type { Locale } from "@/lib/i18n/strings";
import type { BusinessCategory } from "@/lib/ads/business";

type Format = { title: string; text: string };
export type AdvertisingCopy = {
  categories: Record<BusinessCategory, string>;
  sponsored: string;
  call: string;
  whatsapp: string;
  website: string;
  validUntil: string;
  shelfTitle: string;
  allShops: string;
  advertiseShop: string;
  directoryTitle: string;
  directoryIntro: string;
  noShops: string;
  businessType: string;
  allTypes: string;
  allDistricts: string;
  show: string;
  pageTitle: string;
  pageIntro: string;
  formatsTitle: string;
  formats: {
    shop: Format;
    banner: Format;
    sponsored: Format;
    google: Format;
  };
  stepsTitle: string;
  steps: string[];
  rulesTitle: string;
  rulesIntro: string;
  rules: string[];
  notAccepted: string;
  notAcceptedList: string[];
  formTitle: string;
  form: {
    businessName: string;
    district: string;
    town: string;
    offer: string;
    offerHint: string;
    phone: string;
    whatsapp: string;
    website: string;
    contactName: string;
    email: string;
    formats: string;
    formatShop: string;
    formatBanner: string;
    formatSponsored: string;
    duration: string;
    week: string;
    month: string;
    quarter: string;
    start: string;
    message: string;
    photoLater: string;
    privacy: string;
    policy: string;
    submit: string;
    submitting: string;
    sent: string;
    failed: string;
    unavailable: string;
  };
};

const kn: AdvertisingCopy = {
  categories: {
    jewellery: "ಆಭರಣ",
    textiles: "ಜವಳಿ ಮತ್ತು ಉಡುಪು",
    sweets: "ಸಿಹಿತಿಂಡಿ ಮತ್ತು ಬೇಕರಿ",
    grocery: "ದಿನಸಿ",
    restaurant: "ಸಸ್ಯಾಹಾರಿ ಹೋಟೆಲ್",
    health: "ಆರೋಗ್ಯ ಮತ್ತು ಔಷಧಾಲಯ",
    education: "ಶಿಕ್ಷಣ ಮತ್ತು ತರಬೇತಿ",
    services: "ಸೇವೆಗಳು",
    electronics: "ಎಲೆಕ್ಟ್ರಾನಿಕ್ಸ್",
    travel: "ಪ್ರವಾಸ ಮತ್ತು ಯಾತ್ರೆ",
    real_estate: "ಸ್ಥಿರಾಸ್ತಿ",
    other: "ಇತರೆ",
  },
  sponsored: "ಜಾಹೀರಾತು · ಪ್ರಾಯೋಜಿತ",
  call: "ಕರೆ ಮಾಡಿ",
  whatsapp: "WhatsApp",
  website: "ವೆಬ್‌ಸೈಟ್",
  validUntil: "ಕೊಡುಗೆ ಮಾನ್ಯತೆ",
  shelfTitle: "ಸ್ಥಳೀಯ ಮಳಿಗೆಗಳು",
  allShops: "ಎಲ್ಲಾ ಮಳಿಗೆಗಳು",
  advertiseShop: "ನಿಮ್ಮ ಮಳಿಗೆಯ ಜಾಹೀರಾತು ನೀಡಿ",
  directoryTitle: "ಸ್ಥಳೀಯ ಮಳಿಗೆಗಳು ಮತ್ತು ಸೇವೆಗಳು",
  directoryIntro:
    "ನಮ್ಮ ಸಮುದಾಯದ ಮಳಿಗೆ, ಅಂಗಡಿ ಮತ್ತು ಸೇವೆಗಳ ಪ್ರಾಯೋಜಿತ ಜಾಹೀರಾತುಗಳು. ಪ್ರತಿಯೊಂದು ಜಾಹೀರಾತನ್ನೂ ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ಪರಿಶೀಲಿಸಲಾಗುತ್ತದೆ.",
  noShops: "ಈ ಆಯ್ಕೆಗೆ ಹೊಂದುವ ಜಾಹೀರಾತುಗಳು ಇನ್ನೂ ಇಲ್ಲ.",
  businessType: "ವ್ಯಾಪಾರದ ವಿಧ",
  allTypes: "ಎಲ್ಲಾ ವಿಧಗಳು",
  allDistricts: "ಎಲ್ಲಾ ಜಿಲ್ಲೆಗಳು",
  show: "ತೋರಿಸಿ",
  pageTitle: "ಜ್ವಾಲಾಮಾಲದಲ್ಲಿ ಜಾಹೀರಾತು ನೀಡಿ",
  pageIntro:
    "ಕರ್ನಾಟಕದ ಜೈನ ಸಮುದಾಯದ ಓದುಗರಿಗೆ ನಿಮ್ಮ ಮಳಿಗೆ, ಸೇವೆ ಅಥವಾ ಕಾರ್ಯಕ್ರಮವನ್ನು ಪರಿಚಯಿಸಿ. ಎಲ್ಲಾ ಜಾಹೀರಾತುಗಳನ್ನು ಸ್ಪಷ್ಟವಾಗಿ ಗುರುತಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ಸುದ್ದಿಯಿಂದ ಪ್ರತ್ಯೇಕವಾಗಿರುತ್ತವೆ.",
  formatsTitle: "ಜಾಹೀರಾತಿನ ವಿಧಗಳು",
  formats: {
    shop: {
      title: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಕಾರ್ಡ್",
      text: "ಹೆಸರು, ಕೊಡುಗೆ, ಊರು ಮತ್ತು ಕರೆ/WhatsApp ಬಟನ್‌ಗಳಿರುವ ಕಾರ್ಡ್. ಮುಖಪುಟ, ಜಿಲ್ಲಾ ಪುಟಗಳು ಮತ್ತು ‘ಸ್ಥಳೀಯ ಮಳಿಗೆಗಳು’ ಪುಟದಲ್ಲಿ ಕಾಣಿಸುತ್ತದೆ. ನಿರ್ದಿಷ್ಟ ಜಿಲ್ಲೆಗಳಿಗೆ ಮಾತ್ರವೂ ತೋರಿಸಬಹುದು.",
    },
    banner: {
      title: "ಪೋಸ್ಟರ್ ಮತ್ತು ಬ್ಯಾನರ್",
      text: "16:9 ಬ್ಯಾನರ್ (1280×720) ಪುಟದ ಅಗಲದ ಸ್ಥಳಗಳಲ್ಲಿ, 1:1 ಪೋಸ್ಟರ್ (1080×1080) ಬದಿಯ ಸ್ಥಳಗಳಲ್ಲಿ. ಮುಖಪುಟ ಅಥವಾ ನೀವು ಆರಿಸಿದ ಪುಟಗಳಲ್ಲಿ, ಒಪ್ಪಿದ ದಿನಾಂಕಗಳ ನಡುವೆ ಮಾತ್ರ ಕಾಣಿಸುತ್ತದೆ.",
    },
    sponsored: {
      title: "ಪ್ರಾಯೋಜಿತ ಲೇಖನ",
      text: "ನಿಮ್ಮ ಕಾರ್ಯಕ್ರಮ ಅಥವಾ ಸಂಸ್ಥೆಯ ಕುರಿತ ಲೇಖನ, ‘ಪ್ರಾಯೋಜಿತ ವಿಷಯ’ ಎಂದು ಗುರುತಿಸಿ. ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ನೀವು ಅಂತಿಮ ಆವೃತ್ತಿಯನ್ನು ಅನುಮೋದಿಸುತ್ತೀರಿ.",
    },
    google: {
      title: "Google ಜಾಹೀರಾತುಗಳು",
      text: "ನೇರ ಜಾಹೀರಾತು ಇಲ್ಲದ ಸ್ಥಳಗಳನ್ನು Google AdSense ತುಂಬುತ್ತದೆ. ಇವುಗಳಿಗೆ ಅರ್ಜಿ ಬೇಕಿಲ್ಲ; ಸಂವೇದನಾಶೀಲ ವಿಭಾಗಗಳನ್ನು ನಾವು ನಿರ್ಬಂಧಿಸುತ್ತೇವೆ.",
    },
  },
  stepsTitle: "ಪ್ರಕ್ರಿಯೆ",
  steps: [
    "ಕೆಳಗಿನ ಅರ್ಜಿಯನ್ನು ಭರ್ತಿ ಮಾಡಿ.",
    "ನಮ್ಮ ತಂಡ ಕರೆ ಮಾಡಿ ವಿವರಗಳನ್ನು ದೃಢಪಡಿಸುತ್ತದೆ ಮತ್ತು ಲೋಗೋ/ಚಿತ್ರವನ್ನು ಪಡೆಯುತ್ತದೆ.",
    "ದರ ಮತ್ತು ಅವಧಿ ಒಪ್ಪಿದ ನಂತರ ಪಾವತಿ; ರಸೀದಿ ನೀಡಲಾಗುತ್ತದೆ.",
    "ನಿಯಮಗಳ ಪರಿಶೀಲನೆಯ ನಂತರ ‘ಜಾಹೀರಾತು’ ಗುರುತಿನೊಂದಿಗೆ ಪ್ರಕಟ. ವೀಕ್ಷಣೆ ಮತ್ತು ಕ್ಲಿಕ್ ಅಂಕಿಅಂಶಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳುತ್ತೇವೆ.",
  ],
  rulesTitle: "ಜಾಹೀರಾತು ನಿಯಮಗಳು",
  rulesIntro:
    "ಓದುಗರ ನಂಬಿಕೆಯನ್ನು ಕಾಪಾಡಲು ಪ್ರತಿಯೊಂದು ಜಾಹೀರಾತು ಈ ನಿಯಮಗಳನ್ನು ಪಾಲಿಸಬೇಕು. ಇವು ASCI ಜಾಹೀರಾತು ಸಂಹಿತೆ ಮತ್ತು ಗ್ರಾಹಕ ಸಂರಕ್ಷಣಾ ಕಾಯ್ದೆ 2019 ಅನ್ನು ಆಧರಿಸಿವೆ.",
  rules: [
    "ಪ್ರತಿಯೊಂದು ಜಾಹೀರಾತಿನ ಮೇಲೂ ‘ಜಾಹೀರಾತು’ ಅಥವಾ ‘ಪ್ರಾಯೋಜಿತ’ ಎಂಬ ಗುರುತು ಇರುತ್ತದೆ; ಜಾಹೀರಾತು ಸುದ್ದಿಯಂತೆ ಕಾಣುವಂತಿಲ್ಲ.",
    "ಹೇಳಿಕೆಗಳು ಸತ್ಯವಾಗಿರಬೇಕು ಮತ್ತು ಸಾಬೀತುಪಡಿಸುವಂತಿರಬೇಕು. ಬೆಲೆ ಮತ್ತು ರಿಯಾಯಿತಿಗಳಿಗೆ ಷರತ್ತು ಹಾಗೂ ಮಾನ್ಯತೆಯ ದಿನಾಂಕ ಸ್ಪಷ್ಟವಾಗಿರಬೇಕು.",
    "ಲೋಗೋ, ಚಿತ್ರ ಮತ್ತು ಹೆಸರುಗಳನ್ನು ಬಳಸುವ ಹಕ್ಕು ಜಾಹೀರಾತುದಾರರಿಗೆ ಇರಬೇಕು. ಇತರ ಬ್ರ್ಯಾಂಡ್ ಅಥವಾ ವ್ಯಕ್ತಿಗಳನ್ನು ಅವಹೇಳನ ಮಾಡುವಂತಿಲ್ಲ.",
    "ಫೋನ್ ಮತ್ತು WhatsApp ಸಂಖ್ಯೆಗಳು ಜಾಹೀರಾತುದಾರರದ್ದೇ ಆಗಿರಬೇಕು; ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ಅವುಗಳನ್ನು ದೃಢಪಡಿಸುತ್ತೇವೆ.",
    "ಶ್ರದ್ಧಾಂಜಲಿ ಪುಟಗಳು, ಅರ್ಜಿ ನಮೂನೆಗಳು, ಲಾಗಿನ್ ಮತ್ತು ಖಾತೆ ಪುಟಗಳಲ್ಲಿ ಜಾಹೀರಾತು ಇರುವುದಿಲ್ಲ.",
    "ಜಾಹೀರಾತುಗಳು ಓದುವುದಕ್ಕೆ ಅಡ್ಡಿಯಾಗುವುದಿಲ್ಲ: ಪಾಪ್‌ಅಪ್, ಸ್ವಯಂಚಾಲಿತ ಧ್ವನಿ ಅಥವಾ ಪುಟವನ್ನು ಮುಚ್ಚುವ ಜಾಹೀರಾತುಗಳಿಲ್ಲ.",
    "ಜಾಹೀರಾತುದಾರರು ಸುದ್ದಿ ವಿಷಯ ಅಥವಾ ಸಂಪಾದಕೀಯ ನಿರ್ಧಾರಗಳ ಮೇಲೆ ಪ್ರಭಾವ ಬೀರುವಂತಿಲ್ಲ.",
    "ನಿಯಮ ಉಲ್ಲಂಘಿಸುವ ಜಾಹೀರಾತನ್ನು ಯಾವುದೇ ಹಂತದಲ್ಲಿ ನಿರಾಕರಿಸುವ ಅಥವಾ ತೆಗೆದುಹಾಕುವ ಹಕ್ಕು ಜ್ವಾಲಾಮಾಲಕ್ಕೆ ಇದೆ.",
  ],
  notAccepted: "ಸ್ವೀಕರಿಸದ ಜಾಹೀರಾತುಗಳು",
  notAcceptedList: [
    "ಮಾಂಸ, ಮೀನು, ಮೊಟ್ಟೆ ಮತ್ತು ಮಾಂಸಾಹಾರಿ ಆಹಾರ",
    "ಮದ್ಯ, ತಂಬಾಕು, ಗುಟ್ಕಾ ಮತ್ತು ಮಾದಕ ವಸ್ತುಗಳು",
    "ಜೂಜು, ಬೆಟ್ಟಿಂಗ್, ಲಾಟರಿ ಮತ್ತು ಶೀಘ್ರ ಶ್ರೀಮಂತಿಕೆಯ ಯೋಜನೆಗಳು",
    "ಬೇಟೆ, ಆಯುಧಗಳು ಮತ್ತು ಪ್ರಾಣಿ ಹಿಂಸೆ ಒಳಗೊಂಡ ಉತ್ಪನ್ನಗಳು",
    "ವಯಸ್ಕರ ವಿಷಯ ಮತ್ತು ಸಾಬೀತಾಗದ ವೈದ್ಯಕೀಯ ‘ಖಚಿತ ಗುಣ’ ಹೇಳಿಕೆಗಳು",
    "ರಾಜಕೀಯ ಪಕ್ಷ ಅಥವಾ ಚುನಾವಣಾ ಪ್ರಚಾರ",
  ],
  formTitle: "ಜಾಹೀರಾತಿಗಾಗಿ ಅರ್ಜಿ",
  form: {
    businessName: "ಮಳಿಗೆ ಅಥವಾ ಸಂಸ್ಥೆಯ ಹೆಸರು",
    district: "ಜಿಲ್ಲೆ",
    town: "ಊರು",
    offer: "ಜಾಹೀರಾತಿನ ಸಂದೇಶ",
    offerHint: "160 ಅಕ್ಷರಗಳೊಳಗೆ. ಉದಾ: ಹಬ್ಬದ ಹೊಸ ಸಂಗ್ರಹ ಬಂದಿದೆ.",
    phone: "ಮಳಿಗೆಯ ಫೋನ್ ಸಂಖ್ಯೆ",
    whatsapp: "WhatsApp ಸಂಖ್ಯೆ (ಐಚ್ಛಿಕ)",
    website: "ವೆಬ್‌ಸೈಟ್ (ಐಚ್ಛಿಕ, https://)",
    contactName: "ಸಂಪರ್ಕ ವ್ಯಕ್ತಿಯ ಹೆಸರು",
    email: "ಇಮೇಲ್",
    formats: "ಬೇಕಾದ ಜಾಹೀರಾತಿನ ವಿಧ",
    formatShop: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಕಾರ್ಡ್",
    formatBanner: "ಪೋಸ್ಟರ್ / ಬ್ಯಾನರ್ (16:9, 1:1)",
    formatSponsored: "ಪ್ರಾಯೋಜಿತ ಲೇಖನ",
    duration: "ಅವಧಿ",
    week: "1 ವಾರ",
    month: "1 ತಿಂಗಳು",
    quarter: "3 ತಿಂಗಳು",
    start: "ಆರಂಭಿಸಲು ಬಯಸುವ ದಿನಾಂಕ",
    message: "ತಂಡಕ್ಕೆ ಹೆಚ್ಚುವರಿ ಮಾಹಿತಿ (ಐಚ್ಛಿಕ)",
    photoLater:
      "ಲೋಗೋ ಅಥವಾ ಮಳಿಗೆಯ ಚಿತ್ರವನ್ನು ಪರಿಶೀಲನೆಯ ಕರೆಯ ವೇಳೆ ನಮ್ಮ ತಂಡ ಪಡೆಯುತ್ತದೆ.",
    privacy:
      "ನಿಮ್ಮ ಹೆಸರು ಮತ್ತು ಇಮೇಲ್ ಜಾಹೀರಾತು ಪರಿಶೀಲನೆ ಮತ್ತು ಬಿಲ್ಲಿಂಗ್‌ಗೆ ಮಾತ್ರ. ಸಾರ್ವಜನಿಕವಾಗಿ ಕಾಣುವುದು ಮಳಿಗೆಯ ಹೆಸರು, ಸಂದೇಶ, ಊರು, ಫೋನ್/WhatsApp ಮತ್ತು ವೆಬ್‌ಸೈಟ್ ಮಾತ್ರ.",
    policy:
      "ಮೇಲಿನ ಜಾಹೀರಾತು ನಿಯಮಗಳನ್ನು ಓದಿದ್ದೇನೆ. ನೀಡಿದ ಮಾಹಿತಿ ಸತ್ಯ ಮತ್ತು ಲೋಗೋ/ಚಿತ್ರ ಬಳಸುವ ಹಕ್ಕು ನನಗಿದೆ.",
    submit: "ಅರ್ಜಿ ಕಳುಹಿಸಿ",
    submitting: "ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ…",
    sent: "ಅರ್ಜಿ ತಲುಪಿದೆ. ಪರಿಶೀಲನೆಯ ನಂತರ ನಮ್ಮ ತಂಡ ನಿಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸುತ್ತದೆ.",
    failed: "ಅರ್ಜಿ ಕಳುಹಿಸಲಾಗಲಿಲ್ಲ. ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.",
    unavailable:
      "ಆನ್‌ಲೈನ್ ಅರ್ಜಿ ಸೇವೆ ಇನ್ನೂ ಸಕ್ರಿಯವಾಗಿಲ್ಲ. ಸಂಪರ್ಕ ಪುಟದ ಮೂಲಕ ನಮಗೆ ಬರೆಯಿರಿ.",
  },
};

const en: AdvertisingCopy = {
  categories: {
    jewellery: "Jewellery",
    textiles: "Textiles & clothing",
    sweets: "Sweets & bakery",
    grocery: "Grocery",
    restaurant: "Vegetarian restaurant",
    health: "Health & pharmacy",
    education: "Education & coaching",
    services: "Services",
    electronics: "Electronics",
    travel: "Travel & pilgrimage",
    real_estate: "Real estate",
    other: "Other",
  },
  sponsored: "Advertisement · Sponsored",
  call: "Call",
  whatsapp: "WhatsApp",
  website: "Website",
  validUntil: "Offer valid until",
  shelfTitle: "Local shops",
  allShops: "All local shops",
  advertiseShop: "Advertise your shop",
  directoryTitle: "Local shops and services",
  directoryIntro:
    "Sponsored listings from shops, stores and services in our community. Every ad is reviewed before it is published.",
  noShops: "No shop ads match this selection yet.",
  businessType: "Type of business",
  allTypes: "All types",
  allDistricts: "All districts",
  show: "Show",
  pageTitle: "Advertise with Jwalamala",
  pageIntro:
    "Introduce your shop, service or event to readers in Karnataka’s Jain community. Every advertisement is clearly labelled and kept separate from the news.",
  formatsTitle: "Ad formats",
  formats: {
    shop: {
      title: "Local shop card",
      text: "A card with your name, offer, town and Call/WhatsApp buttons. It appears on the home page, district pages and the Local shops page, and can be limited to chosen districts.",
    },
    banner: {
      title: "Poster and banner",
      text: "A 16:9 banner (1280×720) in full-width spaces or a 1:1 poster (1080×1080) in sidebars, on the home page or the pages you choose, shown only between the agreed dates.",
    },
    sponsored: {
      title: "Sponsored article",
      text: "An article about your event or organisation, labelled ‘Sponsored content’. You approve the final version before it is published.",
    },
    google: {
      title: "Google ads",
      text: "Google AdSense fills spaces that have no direct ad. No application is needed; we block sensitive categories.",
    },
  },
  stepsTitle: "How it works",
  steps: [
    "Fill in the application below.",
    "Our team calls to confirm the details and collects your logo or photo.",
    "Once the rate and duration are agreed, you pay and receive a receipt.",
    "After a check against the rules, the ad is published with an ‘Advertisement’ label. We share view and click figures.",
  ],
  rulesTitle: "Advertising rules",
  rulesIntro:
    "To keep readers’ trust, every advertisement must follow these rules. They are based on the ASCI Code for Self-Regulation of Advertising and the Consumer Protection Act, 2019.",
  rules: [
    "Every ad carries an ‘Advertisement’ or ‘Sponsored’ label and must not look like news.",
    "Claims must be truthful and capable of substantiation. Prices and discounts must state their conditions and validity date.",
    "The advertiser must hold the rights to the logo, images and names used, and must not disparage other brands or people.",
    "Phone and WhatsApp numbers must belong to the advertiser; we verify them before publishing.",
    "No ads appear on condolence notices, forms, login or account pages.",
    "Ads never get in the way of reading: no pop-ups, autoplaying sound or ads that cover the page.",
    "Advertisers have no influence over news coverage or editorial decisions.",
    "Jwalamala may refuse or remove any ad that breaks these rules, at any stage.",
  ],
  notAccepted: "Ads we do not accept",
  notAcceptedList: [
    "Meat, fish, eggs and non-vegetarian food",
    "Alcohol, tobacco, gutka and intoxicants",
    "Gambling, betting, lotteries and get-rich-quick schemes",
    "Hunting, weapons and products involving harm to animals",
    "Adult content and unproven medical ‘guaranteed cure’ claims",
    "Political party or election campaigning",
  ],
  formTitle: "Apply to advertise",
  form: {
    businessName: "Shop or organisation name",
    district: "District",
    town: "Town",
    offer: "Ad message",
    offerHint:
      "Up to 160 characters. For example: our new festive collection is here.",
    phone: "Shop phone number",
    whatsapp: "WhatsApp number (optional)",
    website: "Website (optional, https://)",
    contactName: "Contact person",
    email: "Email",
    formats: "Ad formats you want",
    formatShop: "Local shop card",
    formatBanner: "Poster / banner (16:9, 1:1)",
    formatSponsored: "Sponsored article",
    duration: "Duration",
    week: "1 week",
    month: "1 month",
    quarter: "3 months",
    start: "Preferred start date",
    message: "Anything else for our team (optional)",
    photoLater:
      "Our team collects your logo or shop photo during the verification call.",
    privacy:
      "Your name and email are used only for reviewing and billing the ad. Readers only see the shop name, message, town, phone/WhatsApp and website.",
    policy:
      "I have read the advertising rules above. The details are true and I have the right to use the logo and images.",
    submit: "Send application",
    submitting: "Sending…",
    sent: "Application received. Our team will contact you after review.",
    failed:
      "The application could not be sent. Check the details and try again.",
    unavailable:
      "Online applications are not enabled yet. Please write to us through the contact page.",
  },
};

const hi: AdvertisingCopy = {
  categories: {
    jewellery: "आभूषण",
    textiles: "कपड़े और वस्त्र",
    sweets: "मिठाई और बेकरी",
    grocery: "किराना",
    restaurant: "शाकाहारी भोजनालय",
    health: "स्वास्थ्य और फ़ार्मेसी",
    education: "शिक्षा और कोचिंग",
    services: "सेवाएँ",
    electronics: "इलेक्ट्रॉनिक्स",
    travel: "यात्रा और तीर्थ",
    real_estate: "रियल एस्टेट",
    other: "अन्य",
  },
  sponsored: "विज्ञापन · प्रायोजित",
  call: "कॉल करें",
  whatsapp: "WhatsApp",
  website: "वेबसाइट",
  validUntil: "ऑफ़र मान्य",
  shelfTitle: "स्थानीय दुकानें",
  allShops: "सभी दुकानें",
  advertiseShop: "अपनी दुकान का विज्ञापन दें",
  directoryTitle: "स्थानीय दुकानें और सेवाएँ",
  directoryIntro:
    "हमारे समुदाय की दुकानों, प्रतिष्ठानों और सेवाओं के प्रायोजित विज्ञापन। हर विज्ञापन प्रकाशन से पहले जाँचा जाता है।",
  noShops: "इस चयन से मेल खाने वाले विज्ञापन अभी नहीं हैं।",
  businessType: "व्यवसाय का प्रकार",
  allTypes: "सभी प्रकार",
  allDistricts: "सभी ज़िले",
  show: "दिखाएँ",
  pageTitle: "ज्वालामाल में विज्ञापन दें",
  pageIntro:
    "कर्नाटक के जैन समुदाय के पाठकों तक अपनी दुकान, सेवा या कार्यक्रम पहुँचाएँ। हर विज्ञापन स्पष्ट रूप से चिह्नित होता है और समाचार से अलग रहता है।",
  formatsTitle: "विज्ञापन के प्रकार",
  formats: {
    shop: {
      title: "स्थानीय दुकान कार्ड",
      text: "नाम, ऑफ़र, स्थान और कॉल/WhatsApp बटन वाला कार्ड। यह होम पेज, ज़िला पृष्ठों और ‘स्थानीय दुकानें’ पृष्ठ पर दिखता है, और चुने हुए ज़िलों तक सीमित किया जा सकता है।",
    },
    banner: {
      title: "पोस्टर और बैनर",
      text: "पूरी चौड़ाई वाले स्थानों में 16:9 बैनर (1280×720) या साइडबार में 1:1 पोस्टर (1080×1080), होम पेज या आपके चुने पृष्ठों पर, केवल तय तिथियों के बीच।",
    },
    sponsored: {
      title: "प्रायोजित लेख",
      text: "आपके कार्यक्रम या संस्था पर लेख, ‘प्रायोजित सामग्री’ के रूप में चिह्नित। प्रकाशन से पहले अंतिम संस्करण आप स्वीकृत करते हैं।",
    },
    google: {
      title: "Google विज्ञापन",
      text: "जिन स्थानों पर सीधा विज्ञापन नहीं है, उन्हें Google AdSense भरता है। इसके लिए आवेदन नहीं चाहिए; संवेदनशील श्रेणियाँ हम रोकते हैं।",
    },
  },
  stepsTitle: "प्रक्रिया",
  steps: [
    "नीचे दिया आवेदन भरें।",
    "हमारी टीम कॉल करके विवरण की पुष्टि करती है और लोगो/चित्र लेती है।",
    "दर और अवधि तय होने पर भुगतान; रसीद दी जाती है।",
    "नियमों की जाँच के बाद ‘विज्ञापन’ चिह्न के साथ प्रकाशन। हम व्यू और क्लिक के आँकड़े साझा करते हैं।",
  ],
  rulesTitle: "विज्ञापन नियम",
  rulesIntro:
    "पाठकों का भरोसा बनाए रखने के लिए हर विज्ञापन को इन नियमों का पालन करना होगा। ये ASCI विज्ञापन संहिता और उपभोक्ता संरक्षण अधिनियम, 2019 पर आधारित हैं।",
  rules: [
    "हर विज्ञापन पर ‘विज्ञापन’ या ‘प्रायोजित’ का चिह्न रहता है; विज्ञापन समाचार जैसा नहीं दिखना चाहिए।",
    "दावे सच्चे और प्रमाणित करने योग्य हों। मूल्य और छूट की शर्तें तथा वैधता तिथि स्पष्ट हो।",
    "लोगो, चित्र और नामों के उपयोग का अधिकार विज्ञापनदाता के पास हो; अन्य ब्रांड या व्यक्तियों की निंदा न हो।",
    "फ़ोन और WhatsApp नंबर विज्ञापनदाता के ही हों; प्रकाशन से पहले हम उनकी पुष्टि करते हैं।",
    "श्रद्धांजलि सूचनाओं, फ़ॉर्म, लॉगिन और खाता पृष्ठों पर विज्ञापन नहीं होते।",
    "विज्ञापन पढ़ने में बाधा नहीं डालते: पॉप-अप, अपने-आप चलने वाली आवाज़ या पृष्ठ ढकने वाले विज्ञापन नहीं।",
    "विज्ञापनदाता समाचार या संपादकीय निर्णयों को प्रभावित नहीं कर सकते।",
    "नियम तोड़ने वाले किसी भी विज्ञापन को ज्वालामाल किसी भी चरण में अस्वीकार या हटा सकता है।",
  ],
  notAccepted: "जो विज्ञापन हम स्वीकार नहीं करते",
  notAcceptedList: [
    "मांस, मछली, अंडे और मांसाहारी भोजन",
    "शराब, तंबाकू, गुटखा और नशीले पदार्थ",
    "जुआ, सट्टा, लॉटरी और जल्दी अमीर बनने की योजनाएँ",
    "शिकार, हथियार और पशु-हिंसा वाले उत्पाद",
    "वयस्क सामग्री और अप्रमाणित ‘पक्का इलाज’ जैसे चिकित्सीय दावे",
    "राजनीतिक दल या चुनाव प्रचार",
  ],
  formTitle: "विज्ञापन के लिए आवेदन",
  form: {
    businessName: "दुकान या संस्था का नाम",
    district: "ज़िला",
    town: "स्थान",
    offer: "विज्ञापन संदेश",
    offerHint: "160 अक्षरों तक। उदाहरण: त्योहार का नया संग्रह आ गया है।",
    phone: "दुकान का फ़ोन नंबर",
    whatsapp: "WhatsApp नंबर (वैकल्पिक)",
    website: "वेबसाइट (वैकल्पिक, https://)",
    contactName: "संपर्क व्यक्ति",
    email: "ईमेल",
    formats: "चाहे गए विज्ञापन प्रकार",
    formatShop: "स्थानीय दुकान कार्ड",
    formatBanner: "पोस्टर / बैनर (16:9, 1:1)",
    formatSponsored: "प्रायोजित लेख",
    duration: "अवधि",
    week: "1 सप्ताह",
    month: "1 महीना",
    quarter: "3 महीने",
    start: "शुरू करने की पसंदीदा तिथि",
    message: "टीम के लिए अतिरिक्त जानकारी (वैकल्पिक)",
    photoLater: "लोगो या दुकान का चित्र हमारी टीम पुष्टि कॉल के दौरान लेगी।",
    privacy:
      "आपका नाम और ईमेल केवल विज्ञापन की जाँच और बिलिंग के लिए है। पाठकों को केवल दुकान का नाम, संदेश, स्थान, फ़ोन/WhatsApp और वेबसाइट दिखती है।",
    policy:
      "मैंने ऊपर दिए विज्ञापन नियम पढ़ लिए हैं। दी गई जानकारी सच है और लोगो/चित्र के उपयोग का अधिकार मेरे पास है।",
    submit: "आवेदन भेजें",
    submitting: "भेजा जा रहा है…",
    sent: "आवेदन मिल गया। जाँच के बाद हमारी टीम आपसे संपर्क करेगी।",
    failed: "आवेदन नहीं भेजा जा सका। विवरण जाँचकर फिर प्रयास करें।",
    unavailable:
      "ऑनलाइन आवेदन सेवा अभी सक्रिय नहीं है। कृपया संपर्क पृष्ठ के माध्यम से लिखें।",
  },
};

export const advertisingCopy = (locale: Locale) => ({ kn, en, hi })[locale];
