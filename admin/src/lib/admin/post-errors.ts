import type { Tri } from "@/lib/i18n/strings";

/** A save failure the editor can show next to the field that caused it. */
export type PostError = { field?: string; message: Tri };

const field: Record<string, Tri> = {
  title_kn: {
    en: "Title: write a Kannada title of at least 3 characters.",
    kn: "ಶೀರ್ಷಿಕೆ: ಕನಿಷ್ಠ 3 ಅಕ್ಷರಗಳ ಕನ್ನಡ ಶೀರ್ಷಿಕೆ ಬರೆಯಿರಿ.",
    hi: "शीर्षक: कम से कम 3 अक्षरों का कन्नड़ शीर्षक लिखें।",
  },
  slug: {
    en: "Web address (slug): use only small English letters, numbers and hyphens (-), up to 150 characters.",
    kn: "ವೆಬ್ ವಿಳಾಸ (slug): ಸಣ್ಣ ಇಂಗ್ಲಿಷ್ ಅಕ್ಷರಗಳು, ಅಂಕಿಗಳು ಮತ್ತು ಹೈಫನ್ (-) ಮಾತ್ರ ಬಳಸಿ, 150 ಅಕ್ಷರಗಳವರೆಗೆ.",
    hi: "वेब पता (slug): केवल छोटे अंग्रेज़ी अक्षर, अंक और हाइफ़न (-) इस्तेमाल करें, 150 अक्षरों तक।",
  },
  primary_category: {
    en: "Primary category: choose one.",
    kn: "ಮುಖ್ಯ ವರ್ಗ: ಒಂದನ್ನು ಆಯ್ಕೆಮಾಡಿ.",
    hi: "मुख्य श्रेणी: एक चुनें।",
  },
  thumbnail_url: {
    en: "Cover image: paste a YouTube thumbnail link, an ImageKit link, or a cloud image link ending in .jpg, .png or .webp.",
    kn: "ಮುಖಪುಟ ಚಿತ್ರ: YouTube ಥಂಬ್‌ನೇಲ್ ಲಿಂಕ್, ImageKit ಲಿಂಕ್, ಅಥವಾ .jpg, .png, .webp ನಲ್ಲಿ ಕೊನೆಗೊಳ್ಳುವ ಕ್ಲೌಡ್ ಚಿತ್ರದ ಲಿಂಕ್ ಅಂಟಿಸಿ.",
    hi: "कवर इमेज: YouTube थंबनेल लिंक, ImageKit लिंक, या .jpg, .png, .webp पर खत्म होने वाला क्लाउड चित्र लिंक चिपकाएँ।",
  },
  image_credit: {
    en: "Image credit: keep it under 200 characters.",
    kn: "ಚಿತ್ರ ಕೃಪೆ: 200 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "इमेज क्रेडिट: 200 अक्षरों से कम रखें।",
  },
  event_date: {
    en: "Event date: pick a valid date, or leave it empty.",
    kn: "ಕಾರ್ಯಕ್ರಮದ ದಿನಾಂಕ: ಸರಿಯಾದ ದಿನಾಂಕ ಆಯ್ಕೆಮಾಡಿ, ಅಥವಾ ಖಾಲಿ ಬಿಡಿ.",
    hi: "कार्यक्रम की तारीख़: सही तारीख़ चुनें, या ख़ाली छोड़ दें।",
  },
  event_place: {
    en: "Place: keep it under 150 characters.",
    kn: "ಸ್ಥಳ: 150 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "स्थान: 150 अक्षरों से कम रखें।",
  },
  place_id: {
    en: "District / town page: choose the place from the list again.",
    kn: "ಜಿಲ್ಲೆ / ಊರಿನ ಪುಟ: ಪಟ್ಟಿಯಿಂದ ಸ್ಥಳವನ್ನು ಮತ್ತೆ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "ज़िला / शहर पेज: सूची से स्थान फिर से चुनें।",
  },
  video_url: {
    en: "Video: this is not a YouTube or Facebook video link. Paste the video's own link, or the <iframe> code from Share → Embed.",
    kn: "ವಿಡಿಯೋ: ಇದು YouTube ಅಥವಾ Facebook ವಿಡಿಯೋ ಲಿಂಕ್ ಅಲ್ಲ. ವಿಡಿಯೋದ ಲಿಂಕ್ ಅಥವಾ Share → Embed ನಲ್ಲಿನ <iframe> ಕೋಡ್ ಅಂಟಿಸಿ.",
    hi: "वीडियो: यह YouTube या Facebook वीडियो लिंक नहीं है। वीडियो का लिंक, या Share → Embed से <iframe> कोड चिपकाएँ।",
  },
  seo_title: {
    en: "SEO title: keep it to 110 characters or fewer.",
    kn: "SEO ಶೀರ್ಷಿಕೆ: 110 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "SEO शीर्षक: 110 अक्षरों या उससे कम रखें।",
  },
  seo_description: {
    en: "SEO description: keep it to 300 characters or fewer.",
    kn: "SEO ವಿವರಣೆ: 300 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "SEO विवरण: 300 अक्षरों या उससे कम रखें।",
  },
  seo_keywords: {
    en: "SEO keywords: keep them under 500 characters in total.",
    kn: "SEO ಕೀವರ್ಡ್‌ಗಳು: ಒಟ್ಟು 500 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "SEO कीवर्ड: कुल 500 अक्षरों से कम रखें।",
  },
  sponsor_name: {
    en: "Sponsor name: keep it under 150 characters.",
    kn: "ಪ್ರಾಯೋಜಕರ ಹೆಸರು: 150 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
    hi: "प्रायोजक का नाम: 150 अक्षरों से कम रखें।",
  },
  body_html: {
    en: "Body: the article text is too long. Split it into two articles.",
    kn: "ಲೇಖನ: ಪಠ್ಯ ತುಂಬಾ ಉದ್ದವಾಗಿದೆ. ಎರಡು ಲೇಖನಗಳಾಗಿ ವಿಭಜಿಸಿ.",
    hi: "लेख: पाठ बहुत लंबा है। इसे दो लेखों में बाँटें।",
  },
  media_images: {
    en: "Gallery images: use ImageKit links, at most 3, each with a credit.",
    kn: "ಗ್ಯಾಲರಿ ಚಿತ್ರಗಳು: ImageKit ಲಿಂಕ್‌ಗಳನ್ನು ಬಳಸಿ, ಗರಿಷ್ಠ 3, ಪ್ರತಿಯೊಂದಕ್ಕೂ ಕೃಪೆ ಸಹಿತ.",
    hi: "गैलरी इमेज: ImageKit लिंक इस्तेमाल करें, अधिकतम 3, हर एक के क्रेडिट के साथ।",
  },
  tag_ids: {
    en: "Tags: choose 20 or fewer.",
    kn: "ಟ್ಯಾಗ್‌ಗಳು: 20 ಅಥವಾ ಕಡಿಮೆ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "टैग: 20 या उससे कम चुनें।",
  },
  category_ids: {
    en: "Also show in: choose 30 or fewer categories.",
    kn: "ಇತರ ವರ್ಗಗಳು: 30 ಅಥವಾ ಕಡಿಮೆ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "इनमें भी दिखाएँ: 30 या उससे कम श्रेणियाँ चुनें।",
  },
  public_author_id: {
    en: "Author: choose the author from the list again.",
    kn: "ಲೇಖಕರು: ಪಟ್ಟಿಯಿಂದ ಲೇಖಕರನ್ನು ಮತ್ತೆ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "लेखक: सूची से लेखक फिर से चुनें।",
  },
  event_id: {
    en: "Related event: choose the event from the list again.",
    kn: "ಸಂಬಂಧಿತ ಕಾರ್ಯಕ್ರಮ: ಪಟ್ಟಿಯಿಂದ ಮತ್ತೆ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "संबंधित कार्यक्रम: सूची से फिर से चुनें।",
  },
  status: {
    en: "Status: choose Draft, Published or Scheduled.",
    kn: "ಸ್ಥಿತಿ: ಕರಡು, ಪ್ರಕಟಿತ ಅಥವಾ ನಿಗದಿತ ಆಯ್ಕೆಮಾಡಿ.",
    hi: "स्थिति: ड्राफ़्ट, प्रकाशित या शेड्यूल चुनें।",
  },
};

export const postErrors = {
  titleTooLong: {
    field: "title_kn",
    message: {
      en: "Title: keep it to 110 characters or fewer to publish.",
      kn: "ಶೀರ್ಷಿಕೆ: ಪ್ರಕಟಿಸಲು 110 ಅಕ್ಷರಗಳೊಳಗೆ ಇರಲಿ.",
      hi: "शीर्षक: प्रकाशित करने के लिए 110 अक्षरों या उससे कम रखें।",
    },
  },
  bodyRequired: {
    field: "body_html",
    message: {
      en: "Body: write the article text before publishing.",
      kn: "ಲೇಖನ: ಪ್ರಕಟಿಸುವ ಮೊದಲು ಲೇಖನದ ಪಠ್ಯ ಬರೆಯಿರಿ.",
      hi: "लेख: प्रकाशित करने से पहले लेख का पाठ लिखें।",
    },
  },
  scheduleInPast: {
    field: "scheduled_for",
    message: {
      en: "Publish at: choose a future date and time to schedule this article.",
      kn: "ಪ್ರಕಟಣೆಯ ಸಮಯ: ನಿಗದಿಪಡಿಸಲು ಮುಂದಿನ ದಿನಾಂಕ ಮತ್ತು ಸಮಯ ಆಯ್ಕೆಮಾಡಿ.",
      hi: "प्रकाशन समय: शेड्यूल करने के लिए आने वाली तारीख़ और समय चुनें।",
    },
  },
  shortNeedsVideo: {
    field: "video_url",
    message: {
      en: "Video: a short video needs a YouTube or Facebook link.",
      kn: "ವಿಡಿಯೋ: ಶಾರ್ಟ್ ವಿಡಿಯೋಗೆ YouTube ಅಥವಾ Facebook ಲಿಂಕ್ ಬೇಕು.",
      hi: "वीडियो: शॉर्ट वीडियो के लिए YouTube या Facebook लिंक चाहिए।",
    },
  },
  badVideo: { field: "video_url", message: field.video_url },
  noEditPermission: {
    message: {
      en: "You don't have permission to create or edit articles. Ask an administrator for access.",
      kn: "ಲೇಖನ ರಚಿಸಲು ಅಥವಾ ತಿದ್ದಲು ನಿಮಗೆ ಅನುಮತಿ ಇಲ್ಲ. ನಿರ್ವಾಹಕರನ್ನು ಸಂಪರ್ಕಿಸಿ.",
      hi: "आपको लेख बनाने या संपादित करने की अनुमति नहीं है। व्यवस्थापक से अनुमति लें।",
    },
  },
  noPublishPermission: {
    field: "status",
    message: {
      en: "You can save drafts but not publish. Set Status to Draft, or ask an editor to publish.",
      kn: "ನೀವು ಕರಡು ಉಳಿಸಬಹುದು, ಪ್ರಕಟಿಸಲು ಅನುಮತಿ ಇಲ್ಲ. ಸ್ಥಿತಿಯನ್ನು ಕರಡು ಮಾಡಿ, ಅಥವಾ ಸಂಪಾದಕರಿಗೆ ಹೇಳಿ.",
      hi: "आप ड्राफ़्ट सहेज सकते हैं, प्रकाशित नहीं कर सकते। स्थिति ड्राफ़्ट करें, या संपादक से प्रकाशित कराएँ।",
    },
  },
  locked: {
    message: {
      en: "Another editor has this article open. Try again in a few minutes.",
      kn: "ಇನ್ನೊಬ್ಬ ಸಂಪಾದಕರು ಈ ಲೇಖನವನ್ನು ತೆರೆದಿದ್ದಾರೆ. ಕೆಲವು ನಿಮಿಷಗಳ ನಂತರ ಪ್ರಯತ್ನಿಸಿ.",
      hi: "कोई और संपादक यह लेख खोले हुए है। कुछ मिनट बाद फिर कोशिश करें।",
    },
  },
  embargo: {
    field: "embargo_until",
    message: {
      en: "Embargo time hasn't passed yet. Schedule the article for after the embargo, or clear the embargo time.",
      kn: "ನಿರ್ಬಂಧದ ಸಮಯ ಇನ್ನೂ ಮುಗಿದಿಲ್ಲ. ಅದರ ನಂತರಕ್ಕೆ ನಿಗದಿಪಡಿಸಿ, ಅಥವಾ ನಿರ್ಬಂಧದ ಸಮಯ ತೆಗೆದುಹಾಕಿ.",
      hi: "प्रतिबंध का समय अभी ख़त्म नहीं हुआ। लेख उसके बाद के लिए शेड्यूल करें, या प्रतिबंध का समय हटाएँ।",
    },
  },
  sponsorApproval: {
    field: "sponsor_name",
    message: {
      en: "Sponsor name: a sponsored article needs the advertiser's approval before it is published. Clear Sponsor name if it isn't sponsored. Otherwise save it as Draft, then use \"Prepare review link\" below the editor and send that link to the advertiser.",
      kn: "ಪ್ರಾಯೋಜಕರ ಹೆಸರು: ಪ್ರಾಯೋಜಿತ ಲೇಖನ ಪ್ರಕಟಿಸುವ ಮೊದಲು ಜಾಹೀರಾತುದಾರರ ಅನುಮೋದನೆ ಬೇಕು. ಪ್ರಾಯೋಜಿತವಲ್ಲದಿದ್ದರೆ ಪ್ರಾಯೋಜಕರ ಹೆಸರನ್ನು ಅಳಿಸಿ. ಇಲ್ಲದಿದ್ದರೆ ಕರಡು ಆಗಿ ಉಳಿಸಿ, ಸಂಪಾದಕದ ಕೆಳಗಿನ \"ಪರಿಶೀಲನಾ ಲಿಂಕ್ ಸಿದ್ಧಪಡಿಸಿ\" ಬಳಸಿ ಆ ಲಿಂಕ್ ಅನ್ನು ಜಾಹೀರಾತುದಾರರಿಗೆ ಕಳುಹಿಸಿ.",
      hi: "प्रायोजक का नाम: प्रायोजित लेख प्रकाशित करने से पहले विज्ञापनदाता की स्वीकृति चाहिए। प्रायोजित नहीं है तो प्रायोजक का नाम हटा दें। नहीं तो ड्राफ़्ट के रूप में सहेजें, फिर संपादक के नीचे \"समीक्षा लिंक तैयार करें\" से लिंक बनाकर विज्ञापनदाता को भेजें।",
    },
  },
  slugTaken: {
    field: "slug",
    message: {
      en: "Web address (slug): another article already uses it. Change the slug.",
      kn: "ವೆಬ್ ವಿಳಾಸ (slug): ಇನ್ನೊಂದು ಲೇಖನ ಇದನ್ನು ಬಳಸುತ್ತಿದೆ. ಬದಲಿಸಿ.",
      hi: "वेब पता (slug): कोई और लेख इसे इस्तेमाल कर रहा है। इसे बदलें।",
    },
  },
} satisfies Record<string, PostError>;

/** The first failed form check, phrased for the field it belongs to. */
export function issueError(issue: { path: PropertyKey[]; code: string }): PostError | null {
  const name = String(issue.path[0] ?? "");
  if (name === "title_kn" && issue.code === "too_big") return postErrors.titleTooLong;
  if (name === "body_json") return { field: "body_html", message: field.body_html };
  if (name === "scheduled_for") return postErrors.scheduleInPast;
  return field[name] ? { field: name, message: field[name] } : null;
}

/** Explains a rejection raised by the database's publishing rules, when it is one. */
export function databaseError(error: { code?: string; message?: string }): PostError | null {
  const message = error.message || "";
  if (error.code === "23505" && message.includes("slug")) return postErrors.slugTaken;
  if (message.includes("locked by another editor")) return postErrors.locked;
  if (message.includes("Publish permission required")) return postErrors.noPublishPermission;
  if (message.includes("Embargo has not ended")) return postErrors.embargo;
  if (message.includes("Advertiser must approve") || message.includes("Advertiser approval required"))
    return postErrors.sponsorApproval;
  if (message.includes("Publication checklist incomplete")) return postErrors.titleTooLong;
  return null;
}
