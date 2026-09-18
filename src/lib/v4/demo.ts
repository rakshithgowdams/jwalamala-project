import { demoPosts, demoEvents } from "@/lib/data/demo";
import type { DataTables, Place } from "./types";
const id = (kind: string, n: number) => `sample-${kind}-${n}`;
const sample = "ಮಾದರಿ ಮಾಹಿತಿ — ಪ್ರಕಟಣೆಗೆ ಮೊದಲು ಸಂಪಾದಕೀಯ ಪರಿಶೀಲನೆ ಅಗತ್ಯ.";
const districtNames = [
  ["bagalkote", "ಬಾಗಲಕೋಟೆ"],
  ["ballari", "ಬಳ್ಳಾರಿ"],
  ["belagavi", "ಬೆಳಗಾವಿ"],
  ["bengaluru-urban", "ಬೆಂಗಳೂರು ನಗರ"],
  ["bengaluru-north", "ಬೆಂಗಳೂರು ಉತ್ತರ"],
  ["bengaluru-south", "ಬೆಂಗಳೂರು ದಕ್ಷಿಣ"],
  ["bidar", "ಬೀದರ್"],
  ["chamarajanagar", "ಚಾಮರಾಜನಗರ"],
  ["chikkaballapur", "ಚಿಕ್ಕಬಳ್ಳಾಪುರ"],
  ["chikkamagaluru", "ಚಿಕ್ಕಮಗಳೂರು"],
  ["chitradurga", "ಚಿತ್ರದುರ್ಗ"],
  ["dakshina-kannada", "ದಕ್ಷಿಣ ಕನ್ನಡ"],
  ["davanagere", "ದಾವಣಗೆರೆ"],
  ["dharwad", "ಧಾರವಾಡ"],
  ["gadag", "ಗದಗ"],
  ["hassan", "ಹಾಸನ"],
  ["haveri", "ಹಾವೇರಿ"],
  ["kalaburagi", "ಕಲಬುರಗಿ"],
  ["kodagu", "ಕೊಡಗು"],
  ["kolar", "ಕೋಲಾರ"],
  ["koppal", "ಕೊಪ್ಪಳ"],
  ["mandya", "ಮಂಡ್ಯ"],
  ["mysuru", "ಮೈಸೂರು"],
  ["raichur", "ರಾಯಚೂರು"],
  ["shivamogga", "ಶಿವಮೊಗ್ಗ"],
  ["tumakuru", "ತುಮಕೂರು"],
  ["udupi", "ಉಡುಪಿ"],
  ["uttara-kannada", "ಉತ್ತರ ಕನ್ನಡ"],
  ["vijayapura", "ವಿಜಯಪುರ"],
  ["vijayanagara", "ವಿಜಯನಗರ"],
  ["yadgir", "ಯಾದಗಿರಿ"],
];
// District slugs are already the standard romanisation, so title-casing them
// gives the English district name rather than leaking a slug into the UI.
const englishDistrict = (slug: string) =>
  slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
const places: Place[] = districtNames.map(([slug, name_kn], i) => ({
  id: id("place", i + 1),
  slug,
  name_kn,
  name_en: englishDistrict(slug),
  district: name_kn,
  is_district: true,
  lat:
    slug === "bengaluru-urban" ? 12.97194 : slug === "hassan" ? 13.00715 : null,
  lng:
    slug === "bengaluru-urban" ? 77.59369 : slug === "hassan" ? 76.0962 : null,
  show_in_weather: slug === "bengaluru-urban" || slug === "hassan",
}));
places.push(
  {
    id: "sample-place-shravana",
    slug: "shravanabelagola",
    name_kn: "ಶ್ರವಣಬೆಳಗೊಳ",
    name_en: "Shravanabelagola",
    district: "ಹಾಸನ",
    lat: null,
    lng: null,
    show_in_weather: false,
  },
  {
    id: "sample-place-moodbidri",
    slug: "moodbidri",
    name_kn: "ಮೂಡುಬಿದಿರೆ",
    name_en: "Moodbidri",
    district: "ದಕ್ಷಿಣ ಕನ್ನಡ",
    lat: null,
    lng: null,
    show_in_weather: false,
  },
  {
    id: "sample-place-karkala",
    slug: "karkala",
    name_kn: "ಕಾರ್ಕಳ",
    name_en: "Karkala",
    district: "ಉಡುಪಿ",
    lat: 13.21428,
    lng: 74.99234,
    show_in_weather: true,
  },
  {
    id: "sample-place-dharmastala",
    slug: "dharmastala",
    name_kn: "ಧರ್ಮಸ್ಥಳ",
    name_en: "Dharmastala",
    district: "ದಕ್ಷಿಣ ಕನ್ನಡ",
    lat: 12.94792,
    lng: 75.38071,
    show_in_weather: true,
  },
);
places.push(
  ...[
    ["bengaluru-city", "ಬೆಂಗಳೂರು", "Bengaluru", "ಬೆಂಗಳೂರು ನಗರ"],
    ["mysuru-city", "ಮೈಸೂರು", "Mysuru", "ಮೈಸೂರು"],
    ["hassan-city", "ಹಾಸನ", "Hassan", "ಹಾಸನ"],
    ["tumakuru-city", "ತುಮಕೂರು", "Tumakuru", "ತುಮಕೂರು"],
    ["belagavi-city", "ಬೆಳಗಾವಿ", "Belagavi", "ಬೆಳಗಾವಿ"],
  ].map(([slug, name_kn, name_en, district]) => ({
    id: "sample-place-" + slug,
    slug,
    name_kn,
    name_en,
    district,
    state: "Karnataka",
    is_district: false,
    lat: null,
    lng: null,
    show_in_weather: false,
  })),
);
const tags: DataTables["tags"][] = [
  ["ahimsa", "ಅಹಿಂಸೆ"],
  ["heritage", "ಜೈನ ಪರಂಪರೆ"],
  ["chaturmasa", "ಚಾತುರ್ಮಾಸ"],
  ["community", "ನಮ್ಮ ಸಮಾಜ"],
  ["panchakalyana", "ಪಂಚಕಲ್ಯಾಣ"],
  ["weather", "ಹವಾಮಾನ"],
].map(([slug, name_kn], i) => ({
  id: id("tag", i + 1),
  slug,
  name_kn,
  is_hidden_from_trending: false,
}));
const postTags = demoPosts.flatMap((p) => [
  {
    post_id: p.id,
    tag_id:
      tags[
        p.category_slugs.includes("basadi")
          ? 1
          : p.category_slugs.includes("chaturmasa")
            ? 2
            : p.category_slugs.includes("panchakalyana")
              ? 4
              : 3
      ].id,
  },
  { post_id: p.id, tag_id: tags[0].id },
]);
export const v4Demo: { [K in keyof DataTables]: DataTables[K][] } = {
  tags,
  places,
  post_tags: postTags,
  authors: [
    {
      id: "sample-author-desk",
      slug: "jwalamala-desk",
      name_kn: "ಜ್ವಾಲಾಮಾಲಾ ಸಂಪಾದಕೀಯ ತಂಡ",
      role_kn: "ಸಂಪಾದಕೀಯ ತಂಡ — ಮಾದರಿ",
      bio_kn: sample,
      credentials_kn: "ಲೇಖಕರ ವಿವರಗಳು ಪರಿಶೀಲನೆಯಲ್ಲಿವೆ.",
      photo_url: null,
      is_active: true,
    },
  ],
  topics: [
    {
      id: id("topic", 1),
      slug: "jain-heritage",
      title_kn: "ನಮ್ಮ ಜೈನ ಪರಂಪರೆ",
      intro_kn: "ಬಸದಿಗಳು, ಇತಿಹಾಸ ಮತ್ತು ಸಂಸ್ಕೃತಿಯ ಕುರಿತ ಮಾದರಿ ವರದಿಗಳ ಸಂಗ್ರಹ.",
      cover_url: "/images/temple.webp",
      key_facts: [
        "ಮಾದರಿ ವಿಷಯಗಳ ಸಂಗ್ರಹ",
        "ಸಂಬಂಧಿತ ಸುದ್ದಿಗಳು ಮತ್ತು ಕಾರ್ಯಕ್ರಮಗಳು",
      ],
      tag_ids: [tags[1].id],
      timeline: [{ date: "2026-09-14", text: "ಪರಂಪರೆ ಪರಿಚಯ — ಮಾದರಿ ವರದಿ" }],
      event_ids: [demoEvents[0].id],
      liveblog_post_id: null,
      is_active: true,
      sort_order: 0,
    },
    {
      id: id("topic", 2),
      slug: "chaturmasa-2026",
      title_kn: "ಚಾತುರ್ಮಾಸ 2026",
      intro_kn: "ಪ್ರವಚನ, ಆತ್ಮಚಿಂತನೆ ಮತ್ತು ಸಮುದಾಯದ ಕಾರ್ಯಕ್ರಮಗಳ ಮಾದರಿ ಸಂಗ್ರಹ.",
      cover_url: "/images/detail.webp",
      key_facts: [sample],
      tag_ids: [tags[2].id, tags[0].id],
      timeline: [],
      event_ids: [],
      liveblog_post_id: "sample-liveblog-1",
      is_active: true,
      sort_order: 1,
    },
    {
      id: id("topic", 3),
      slug: "community-stories",
      title_kn: "ನಮ್ಮ ಸಮಾಜದ ಕಥೆಗಳು",
      intro_kn: "ಶಿಕ್ಷಣ, ಸೇವೆ ಮತ್ತು ಸಾಧನೆಯ ಮಾದರಿ ಕಥೆಗಳು.",
      cover_url: "/images/landscape.webp",
      key_facts: [sample],
      tag_ids: [tags[3].id],
      timeline: [],
      event_ids: [demoEvents[1].id],
      liveblog_post_id: null,
      is_active: true,
      sort_order: 2,
    },
  ],
  topic_pins: [
    { topic_id: id("topic", 1), post_id: demoPosts[1].id, sort_order: 0 },
    { topic_id: id("topic", 2), post_id: demoPosts[2].id, sort_order: 0 },
  ],
  trending_items: [
    ["ನಮ್ಮ ಜೈನ ಪರಂಪರೆ", "/topic/jain-heritage", "topic"],
    ["ವಿಡಿಯೋ", "/videos", "page"],
    ["ಶಾರ್ಟ್ಸ್", "/shorts", "page"],
    ["#ಅಹಿಂಸೆ", "/tag/ahimsa", "tag"],
    ["ಚಾತುರ್ಮಾಸ 2026", "/topic/chaturmasa-2026", "topic"],
    ["ಹವಾಮಾನ", "/weather", "page"],
    ["ಜೈನ ಪಂಚಾಂಗ", "/jain-calendar", "page"],
    ["ಬಸದಿಗಳು", "/basadis", "page"],
    ["ಅವಕಾಶಗಳು", "/opportunities", "page"],
    ["ಸಮುದಾಯ ಪ್ರಕಟಣೆ", "/notices", "page"],
    ["ಚಿತ್ರಕಥೆಗಳು", "/stories", "page"],
    ["ಹಾಸನ ಸುದ್ದಿ", "/place/hassan", "page"],
  ].map(([label_kn, url, type], i) => ({
    id: id("trending", i + 1),
    label_kn,
    url,
    type: type as "topic" | "page" | "tag",
    is_highlight: i === 0,
    starts_at: null,
    ends_at: null,
    sort_order: i,
    is_active: true,
  })),
  series: [
    {
      id: id("series", 1),
      slug: "chaturmasa-reflections",
      title_kn: "ಚಾತುರ್ಮಾಸ ಚಿಂತನೆ",
      description_kn: sample,
      cover_url: "/images/detail.webp",
      is_active: true,
    },
    {
      id: id("series", 2),
      slug: "heritage-journey",
      title_kn: "ಪರಂಪರೆಯ ಪಯಣ",
      description_kn: sample,
      cover_url: "/images/hill.webp",
      is_active: true,
    },
  ],
  series_items: demoPosts
    .filter((p) => p.type === "video")
    .map((p, i) => ({
      series_id: id("series", (i % 2) + 1),
      post_id: p.id,
      episode_no: Math.floor(i / 2) + 1,
    })),
  jain_calendar_days: Array.from({ length: 20 }, (_, i) => ({
    id: id("calendar", i + 1),
    date: `2026-${i < 15 ? "09" : "10"}-${String(i < 15 ? i + 16 : i - 14).padStart(2, "0")}`,
    title_kn: "ಪಂಚಾಂಗ ಟಿಪ್ಪಣಿ — ಮಾದರಿ",
    kind: "note",
    description_kn:
      "ಇದು ನೈಜ ತಿಥಿ ಅಥವಾ ಪರ್ವ ದಿನಾಂಕವಲ್ಲ. ಪರಿಶೀಲಿಸಿದ ಪಂಚಾಂಗವನ್ನು ಸಂಪಾದಕರು ಸೇರಿಸಬೇಕು.",
    is_major: false,
    is_seed: true,
  })),
  basadis: ["ಮೂಡುಬಿದಿರೆ", "ಶ್ರವಣಬೆಳಗೊಳ", "ಕಾರ್ಕಳ", "ಧರ್ಮಸ್ಥಳ", "ಹಾಸನ"].map(
    (name, i) => ({
      id: id("basadi", i + 1),
      slug: [
        "moodbidri",
        "shravanabelagola",
        "karkala",
        "dharmastala",
        "hassan",
      ][i],
      name_kn: name + " ಬಸದಿಯ ಪರಿಚಯ — ಮಾದರಿ",
      name_en: name,
      place_id:
        i === 0
          ? "sample-place-moodbidri"
          : i === 1
            ? "sample-place-shravana"
            : i === 2
              ? "sample-place-karkala"
              : i === 3
                ? "sample-place-dharmastala"
                : places.find((p) => p.slug === "hassan")!.id,
      deity_kn: "ವಿವರಗಳು ಪರಿಶೀಲನೆಯಲ್ಲಿವೆ",
      history_kn: sample,
      timings_kn: "ದರ್ಶನ ಸಮಯವನ್ನು ಸ್ಥಳೀಯ ಆಡಳಿತದಿಂದ ದೃಢಪಡಿಸಿಕೊಳ್ಳಿ.",
      contact: "",
      lat: null,
      lng: null,
      photos: [
        {
          url: "/images/temple.webp",
          credit: "Wikimedia Commons — docs/ASSETS.md",
        },
      ],
      status: "published",
      is_seed: true,
    }),
  ),
  notices: Array.from({ length: 5 }, (_, i) => ({
    id: id("notice", i + 1),
    slug: "sample-notice-" + (i + 1),
    type:
      i === 0 ? "shraddhanjali" : i === 1 ? "student_achievement" : "amantrana",
    title_kn: [
      "ಶ್ರದ್ಧಾಂಜಲಿ ಪ್ರಕಟಣೆಯ ಮಾದರಿ",
      "ವಿದ್ಯಾರ್ಥಿ ಸಾಧನೆಯ ಮಾದರಿ ಪ್ರಕಟಣೆ",
      "ಸಾಂಸ್ಕೃತಿಕ ಕಾರ್ಯಕ್ರಮದ ಮಾದರಿ ಆಹ್ವಾನ",
      "ಸಮಾಜದ ಸಮಾಗಮ — ಮಾದರಿ",
      "ಸೇವಾ ಕಾರ್ಯಕ್ರಮ — ಮಾದರಿ",
    ][i],
    person_name: "",
    photo_url: null,
    body_kn: sample,
    place_id: places[3].id,
    event_date: "2026-09-24",
    contact: "",
    status: "approved",
    published_at: "2026-09-16T06:00:00Z",
    is_seed: true,
  })),
  opportunities: ["scholarship", "job", "competition"].map((kind, i) => ({
    id: id("opportunity", i + 1),
    slug: "sample-opportunity-" + (i + 1),
    title_kn: [
      "ವಿದ್ಯಾರ್ಥಿವೇತನ ಅವಕಾಶ — ಮಾದರಿ",
      "ಉದ್ಯೋಗ ಅವಕಾಶ — ಮಾದರಿ",
      "ಯುವ ಪ್ರತಿಭಾ ಸ್ಪರ್ಧೆ — ಮಾದರಿ",
    ][i],
    org: "ಮಾದರಿ ಸಂಸ್ಥೆ",
    kind: kind as "scholarship" | "job" | "competition",
    place_id: places[3].id,
    last_date: "2026-12-31",
    link: null,
    contact: "",
    description_kn: sample,
    status: "approved",
    is_seed: true,
  })),
  liveblogs: [
    {
      id: "sample-liveblog-1",
      slug: "community-live",
      title_kn: "ಸಮುದಾಯ ಸಮಾಗಮ: ನೇರ ವರದಿಯ ಮಾದರಿ",
      summary_kn: sample,
      cover_url: "/images/landscape.webp",
      event_date: "2026-09-16",
      is_live: true,
      status: "published",
      published_at: "2026-09-16T06:00:00Z",
      is_seed: true,
    },
  ],
  liveblog_updates: Array.from({ length: 8 }, (_, i) => ({
    id: id("update", i + 1),
    liveblog_id: "sample-liveblog-1",
    body_html: `<p>ಮಾದರಿ ಅಪ್‌ಡೇಟ್ ${i + 1}: ಸಮುದಾಯ ಕಾರ್ಯಕ್ರಮದ ವರದಿ ಪ್ರಕಟವಾಗುವ ರೀತಿಯ ಪರಿಚಯ.</p>`,
    is_key: i === 7,
    is_pinned: i === 7,
    published_at: `2026-09-16T${String(6 + i).padStart(2, "0")}:00:00Z`,
    media: null,
  })),
  polls: [
    {
      id: id("poll", 1),
      question_kn: "ಯಾವ ವಿಷಯದ ಸುದ್ದಿಗಳನ್ನು ಹೆಚ್ಚು ಓದಲು ಬಯಸುತ್ತೀರಿ?",
      options: ["ಬಸದಿಗಳ ಇತಿಹಾಸ", "ಪ್ರವಚನ", "ಸಮಾಜ ಸೇವೆ"],
      ends_at: "2026-12-31T18:30:00Z",
      status: "active",
      is_seed: true,
    },
    {
      id: id("poll", 2),
      question_kn: "ನಿಮಗೆ ಯಾವ ರೂಪದ ವರದಿ ಇಷ್ಟ?",
      options: ["ಲೇಖನ", "ವಿಡಿಯೋ", "ಕಿರುಸುದ್ದಿ"],
      ends_at: "2026-12-31T18:30:00Z",
      status: "active",
      is_seed: true,
    },
  ],
  quizzes: [
    {
      id: id("quiz", 1),
      slug: "reading-demo",
      title_kn: "ಓದುವ ಅನುಭವ — ಮಾದರಿ ರಸಪ್ರಶ್ನೆ",
      questions: [
        {
          question: "ಸುದ್ದಿಯನ್ನು ನಂತರ ಓದಲು ಯಾವ ಆಯ್ಕೆ ಬಳಸಬೇಕು?",
          options: ["ಉಳಿಸಿ", "ಹುಡುಕಿ", "ಹಂಚಿಕೊಳ್ಳಿ"],
          answer: 0,
          explanation: "ಉಳಿಸಿ ಆಯ್ಕೆ ಲೇಖನವನ್ನು ಮತ್ತೆ ತೆರೆಯಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.",
        },
        {
          question: "ಕಾರ್ಯಕ್ರಮಕ್ಕೆ ಹೋಗುವ ಮೊದಲು ಏನು ದೃಢಪಡಿಸಬೇಕು?",
          options: ["ಚಿತ್ರದ ಬಣ್ಣ", "ದಿನಾಂಕ ಮತ್ತು ಸ್ಥಳ", "ಪುಟದ ಗಾತ್ರ"],
          answer: 1,
          explanation: "ದಿನಾಂಕ ಮತ್ತು ಸ್ಥಳವನ್ನು ಆಯೋಜಕರಿಂದ ದೃಢಪಡಿಸಿಕೊಳ್ಳಿ.",
        },
      ],
      status: "published",
      is_seed: true,
    },
  ],
  galleries: [
    {
      id: id("gallery", 1),
      slug: "heritage-gallery",
      title_kn: "ಪರಂಪರೆಯ ನೋಟಗಳು",
      description_kn: sample,
      images: ["hill", "temple", "detail"].map((name) => ({
        url: "/images/" + name + ".webp",
        caption: "ಪರಂಪರೆಯ ಚಿತ್ರ — ಮಾದರಿ ವಿನ್ಯಾಸ",
        credit: "Wikimedia Commons — docs/ASSETS.md",
      })),
      event_date: "2026-09-14",
      status: "published",
      is_seed: true,
    },
  ],
  web_stories: [
    {
      id: id("story", 1),
      slug: "heritage-story",
      title_kn: "ಪರಂಪರೆಯ ಚಿತ್ರಕಥೆ",
      cover_url: "/images/hill.webp",
      slides: ["hill", "temple", "detail", "landscape", "temple"].map(
        (name, i) => ({
          image: "/images/" + name + ".webp",
          text: "ನಮ್ಮ ಪರಂಪರೆ — ಮಾದರಿ ಚಿತ್ರಕಥೆ " + (i + 1),
          credit: "Wikimedia Commons — docs/ASSETS.md",
          href: "/topic/jain-heritage",
        }),
      ),
      status: "published",
      published_at: "2026-09-16T06:00:00Z",
      is_seed: true,
    },
  ],
  reservoir_readings: [
    {
      id: id("reservoir", 1),
      reservoir_slug: "sample",
      name_kn: "ಜಲಾಶಯ — ಮಾದರಿ",
      reading_date: "2026-09-16",
      full_level_m: 100,
      level_m: 60,
      storage_pct: 60,
      inflow_cusecs: 0,
      outflow_cusecs: 0,
      source: "ಮಾದರಿ ಅಂಕಿಗಳು; ನೈಜ ಜಲಾಶಯ ಮಾಹಿತಿ ಅಲ್ಲ.",
      is_seed: true,
    },
  ],
  market_rates: [],
  corrections_log: [],
};
