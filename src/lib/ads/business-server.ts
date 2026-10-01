import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { site } from "@/config/site";
import { supabaseFetch } from "@/lib/supabase/fetch";
import { getV4Rows } from "@/lib/v4/queries";
import type { BusinessAd, BusinessAdView } from "./business";

const sampleEnd = "2026-12-31T18:29:59Z";
const sample = (
  slug: string,
  placeSlug: string,
  category: BusinessAd["category"],
  names: [string, string, string],
  offers: [string, string, string],
  extra: Partial<BusinessAd> = {},
): BusinessAd & { place_slug: string } => ({
  id: "sample-business-" + slug,
  slug,
  name_kn: names[0],
  name_en: names[1],
  name_hi: names[2],
  category,
  offer_kn: offers[0],
  offer_en: offers[1],
  offer_hi: offers[2],
  image_url: null,
  phone: "",
  whatsapp: "",
  website: "https://example.com",
  address_kn: "",
  place_id: null,
  target_places: [],
  ends_at: sampleEnd,
  priority: 0,
  weight: 1,
  place_slug: placeSlug,
  ...extra,
});

// Sample shops only: no real business, phone number or offer is implied.
const demoAds = [
  sample(
    "padmavati-cotton",
    "hassan-city",
    "textiles",
    ["ಪದ್ಮಾವತಿ ಹತ್ತಿ ಜವಳಿ", "Padmavati Cotton House", "पद्मावती कॉटन हाउस"],
    [
      "ಹಬ್ಬದ ಹೊಸ ಸಂಗ್ರಹ: ಕೈಮಗ್ಗದ ಹತ್ತಿ ಸೀರೆಗಳು",
      "New festive collection of handloom cotton saris",
      "त्योहार का नया संग्रह: हथकरघा सूती साड़ियाँ",
    ],
  ),
  sample(
    "jina-sweets",
    "moodbidri",
    "sweets",
    ["ಜಿನ ಸ್ವೀಟ್ಸ್", "Jina Sweets", "जिन स्वीट्स"],
    [
      "ಈರುಳ್ಳಿ–ಬೆಳ್ಳುಳ್ಳಿ ರಹಿತ ಶುದ್ಧ ಸಸ್ಯಾಹಾರಿ ಸಿಹಿತಿಂಡಿಗಳು",
      "Pure vegetarian sweets made without onion or garlic",
      "बिना प्याज़-लहसुन की शुद्ध शाकाहारी मिठाइयाँ",
    ],
  ),
  sample(
    "bahubali-jewellers",
    "hassan-city",
    "jewellery",
    ["ಬಾಹುಬಲಿ ಜ್ಯುವೆಲ್ಲರ್ಸ್", "Bahubali Jewellers", "बाहुबली ज्वैलर्स"],
    [
      "ಹಗುರ ಚಿನ್ನಾಭರಣಗಳ ಹೊಸ ವಿನ್ಯಾಸಗಳು",
      "New designs in lightweight gold jewellery",
      "हल्के सोने के गहनों के नए डिज़ाइन",
    ],
    { priority: 1 },
  ),
  sample(
    "samyak-tuition",
    "mysuru-city",
    "education",
    ["ಸಮ್ಯಕ್ ಶಿಕ್ಷಣ ಕೇಂದ್ರ", "Samyak Learning Centre", "सम्यक शिक्षा केंद्र"],
    [
      "ಪಿಯುಸಿ ವಿದ್ಯಾರ್ಥಿಗಳಿಗೆ ಸಂಜೆ ತರಗತಿಗಳು — ಪ್ರವೇಶ ಆರಂಭ",
      "Evening classes for PUC students — admissions open",
      "पीयूसी विद्यार्थियों के लिए शाम की कक्षाएँ — प्रवेश शुरू",
    ],
  ),
  sample(
    "suraksha-yatra",
    "bengaluru-city",
    "travel",
    ["ಸುರಕ್ಷಾ ಯಾತ್ರಾ", "Suraksha Yatra", "सुरक्षा यात्रा"],
    [
      "ಶ್ರವಣಬೆಳಗೊಳ–ಮೂಡುಬಿದಿರೆ ತೀರ್ಥಯಾತ್ರೆ ಪ್ಯಾಕೇಜ್",
      "Shravanabelagola–Moodbidri pilgrimage package",
      "श्रवणबेलगोला–मूडबिद्री तीर्थयात्रा पैकेज",
    ],
  ),
];

async function liveAds(): Promise<BusinessAd[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const db = createClient(url, key, {
    global: { fetch: supabaseFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.rpc("list_business_ads");
  // An ad outage must never take a news page down with it.
  if (error) return [];
  return (data || []) as BusinessAd[];
}

export const getBusinessAds = cache(async (): Promise<BusinessAdView[]> => {
  const places = await getV4Rows("places");
  const rows: BusinessAd[] = site.demo
    ? demoAds.map(({ place_slug, ...ad }) => {
        const place = places.find((p) => p.slug === place_slug);
        const district = places.find(
          (p) => p.is_district && p.district === place?.district,
        );
        return {
          ...ad,
          place_id: place?.id || null,
          target_places:
            ad.slug === "bahubali-jewellers" && district ? [district.id] : [],
        };
      })
    : await liveAds();
  return rows.map((ad) => {
    const place = places.find((p) => p.id === ad.place_id);
    return {
      ...ad,
      place: place
        ? {
            name_kn: place.name_kn,
            name_en: place.name_en,
            name_hi: place.name_hi,
          }
        : null,
      district: place?.district,
    };
  });
});
