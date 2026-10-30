import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Tri } from "@/lib/i18n/strings";

const DAY = 86_400_000;
const isoDay = (offsetDays = 0) =>
  new Date(Date.now() - offsetDays * DAY).toISOString().slice(0, 10);

export const RANGES = [7, 30, 90] as const;
export type Range = (typeof RANGES)[number];
export const parseRange = (value: unknown): Range =>
  RANGES.find((range) => String(range) === value) ?? 30;

type CountResult = { count: number | null; error: unknown };

/** A missing table or a denied RLS policy shows as "unknown", never as zero. */
async function count(query: PromiseLike<CountResult>) {
  const { count, error } = await query;
  return error ? null : (count ?? 0);
}

function sumBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number) {
  const totals = new Map<string, number>();
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) || 0) + value(row));
  return totals;
}

const days = (length: number, endOffset = 0) =>
  Array.from({ length }, (_, i) => isoDay(endOffset + length - 1 - i));

export type Slice = { key: string; value: number };

export type DashboardData = {
  today: string;
  range: Range;
  sample: boolean;
  views: { total: number; previous: number; daily: { day: string; value: number; previous: number }[] };
  engaged: { averageSeconds: number; previousAverage: number };
  published: { total: number | null; inRange: number | null };
  readers: { total: number | null; inRange: number | null };
  counts: {
    drafts: number | null;
    scheduled: number | null;
    archived: number | null;
    upcomingEvents: number | null;
    activeAds: number | null;
    places: number | null;
    toReview: number | null;
  };
  status: Slice[];
  sources: Slice[];
  devices: Slice[];
  scroll: { views: number; s25: number; s50: number; s75: number; s100: number };
  interactions: { shares: number; listens: number; videos: number };
  ads: { impressions: number; clicks: number; daily: { day: string; impressions: number; clicks: number }[] };
  topPosts: { id: string; title: string; views: number; engagedSeconds: number }[];
  perCategory: { label: string; value: number }[];
  activity: { id: string; action: string; table: string; minutesAgo: number; actor: string | null }[];
  events: { id: string; name: string; start: string; daysUntil: number; place: string | null }[];
  review: { label: Tri; value: number | null; href: string }[];
  recent: { id: string; title_kn: string; status: string; updated_at: string }[];
  setup: { done: boolean; title: Tri; detail: Tri; href: string }[];
};

const review = (values: (number | null)[]): DashboardData["review"] => [
  { label: { en: "News tips and submissions", kn: "ಸುದ್ದಿ ಸುಳಿವುಗಳು ಮತ್ತು ಸಲ್ಲಿಕೆಗಳು", hi: "समाचार सुझाव और प्रविष्टियाँ" }, value: values[0], href: "/admin/submissions" },
  { label: { en: "Comments to approve", kn: "ಅನುಮೋದನೆಗೆ ಕಾಯುತ್ತಿರುವ ಅಭಿಪ್ರಾಯಗಳು", hi: "स्वीकृति के लिए टिप्पणियाँ" }, value: values[1], href: "/admin/comments" },
  { label: { en: "Community notices", kn: "ಸಮುದಾಯ ಪ್ರಕಟಣೆಗಳು", hi: "सामुदायिक सूचनाएँ" }, value: values[2], href: "/admin/moderation" },
  { label: { en: "Local shop ad applications", kn: "ಸ್ಥಳೀಯ ಮಳಿಗೆ ಜಾಹೀರಾತು ಅರ್ಜಿಗಳು", hi: "स्थानीय दुकान विज्ञापन आवेदन" }, value: values[3], href: "/admin/business-ads" },
];

const setup = (done: boolean[]): DashboardData["setup"] => [
  {
    done: done[0],
    title: { en: "Publish your first article", kn: "ಮೊದಲ ಲೇಖನವನ್ನು ಪ್ರಕಟಿಸಿ", hi: "अपना पहला लेख प्रकाशित करें" },
    detail: { en: "Write a story, add a cover image and set the status to Published.", kn: "ಸುದ್ದಿ ಬರೆಯಿರಿ, ಮುಖಚಿತ್ರ ಸೇರಿಸಿ ಮತ್ತು ಸ್ಥಿತಿಯನ್ನು ಪ್ರಕಟಿತ ಎಂದು ಆಯ್ಕೆಮಾಡಿ.", hi: "ख़बर लिखें, कवर चित्र जोड़ें और स्थिति प्रकाशित चुनें।" },
    href: "/admin/posts/new",
  },
  {
    done: done[1],
    title: { en: "Choose the big lead story (home page banner)", kn: "ಮುಖಪುಟದ ದೊಡ್ಡ ಮುಖ್ಯ ಸುದ್ದಿಯನ್ನು (ಬ್ಯಾನರ್) ಆಯ್ಕೆಮಾಡಿ", hi: "होम पेज की बड़ी मुख्य ख़बर (बैनर) चुनें" },
    detail: { en: "Tick “Featured” on an article, or pick the lead story in Home page layout.", kn: "ಲೇಖನದಲ್ಲಿ “ವಿಶೇಷ ವರದಿ” ಆಯ್ಕೆಮಾಡಿ, ಅಥವಾ ಮುಖಪುಟ ವಿನ್ಯಾಸದಲ್ಲಿ ಮುಖ್ಯ ಸುದ್ದಿಯನ್ನು ಆರಿಸಿ.", hi: "किसी लेख पर “विशेष” चुनें, या होम पेज लेआउट में मुख्य ख़बर चुनें।" },
    href: "/admin/home",
  },
  {
    done: done[2],
    title: { en: "Add districts and places", kn: "ಜಿಲ್ಲೆ ಮತ್ತು ಊರುಗಳನ್ನು ಸೇರಿಸಿ", hi: "ज़िले और स्थान जोड़ें" },
    detail: { en: "Places power district pages, weather and location filters.", kn: "ಜಿಲ್ಲಾ ಪುಟಗಳು, ಹವಾಮಾನ ಮತ್ತು ಸ್ಥಳ ಫಿಲ್ಟರ್‌ಗಳಿಗೆ ಊರುಗಳು ಬೇಕು.", hi: "ज़िला पेज, मौसम और स्थान फ़िल्टर स्थानों से चलते हैं।" },
    href: "/admin/places",
  },
  {
    done: done[3],
    title: { en: "Add upcoming events", kn: "ಮುಂಬರುವ ಕಾರ್ಯಕ್ರಮಗಳನ್ನು ಸೇರಿಸಿ", hi: "आगामी कार्यक्रम जोड़ें" },
    detail: { en: "Events fill the calendar and the events strip on the home page.", kn: "ಕಾರ್ಯಕ್ರಮಗಳು ಕ್ಯಾಲೆಂಡರ್ ಮತ್ತು ಮುಖಪುಟದ ಕಾರ್ಯಕ್ರಮ ಪಟ್ಟಿಯನ್ನು ತುಂಬುತ್ತವೆ.", hi: "कार्यक्रम कैलेंडर और होम पेज की कार्यक्रम पट्टी भरते हैं।" },
    href: "/admin/events",
  },
  {
    done: done[4],
    title: { en: "Run your first ad", kn: "ಮೊದಲ ಜಾಹೀರಾತನ್ನು ಪ್ರಾರಂಭಿಸಿ", hi: "अपना पहला विज्ञापन चलाएँ" },
    detail: { en: "Paste a poster or banner image link and choose where it shows.", kn: "ಪೋಸ್ಟರ್ ಅಥವಾ ಬ್ಯಾನರ್ ಚಿತ್ರದ ಲಿಂಕ್ ಅಂಟಿಸಿ ಮತ್ತು ಎಲ್ಲಿ ಕಾಣಿಸಬೇಕು ಎಂದು ಆಯ್ಕೆಮಾಡಿ.", hi: "पोस्टर या बैनर चित्र का लिंक चिपकाएँ और चुनें कि वह कहाँ दिखे।" },
    href: "/admin/posters",
  },
];

/** Everything on the dashboard, read through the signed-in user's session so RLS applies. */
export async function loadDashboard(db: SupabaseClient, range: Range): Promise<DashboardData> {
  const today = isoDay(),
    since = isoDay(range - 1),
    sincePrevious = isoDay(range * 2 - 1),
    sinceIso = new Date(Date.now() - range * DAY).toISOString(),
    now = new Date().toISOString();
  const head = (table: string) => db.from(table).select("*", { count: "exact", head: true });

  const [
    published, publishedInRange, drafts, scheduled, archived, featured, upcomingEvents,
    newSubmissions, pendingComments, pendingCommunity, pendingShops,
    readers, readersInRange, activeAds, places,
    views, engagement, traffic, adStats, categories, recent, homepage, audit, events,
  ] = await Promise.all([
    count(head("posts").eq("status", "published")),
    count(head("posts").eq("status", "published").gte("published_at", sinceIso)),
    count(head("posts").eq("status", "draft")),
    count(head("posts").eq("status", "scheduled")),
    count(head("posts").eq("status", "archived")),
    count(head("posts").eq("status", "published").eq("is_featured", true)),
    count(head("events").gte("end_date", today)),
    count(head("submissions").eq("status", "new")),
    count(head("post_comments").eq("status", "pending")),
    count(head("community_submissions").eq("status", "pending")),
    count(head("business_ads").eq("status", "pending")),
    count(head("profiles")),
    count(head("profiles").gte("created_at", sinceIso)),
    count(head("ads").eq("is_active", true).gt("ends_at", now)),
    count(head("places")),
    db.from("post_views_daily").select("day,views,post_id,posts(title_kn)").gte("day", sincePrevious).limit(20000),
    db.from("post_engagement_daily").select("*").gte("day", sincePrevious).limit(20000),
    db.from("traffic_daily").select("source,device,views").gte("day", since).limit(20000),
    db.from("ad_stats_daily").select("day,impressions,clicks").gte("day", since).limit(20000),
    db.from("categories").select("name_kn,post_categories(count)"),
    db.from("posts").select("id,title_kn,status,updated_at").order("updated_at", { ascending: false }).limit(6),
    db.from("site_settings").select("value").eq("key", "homepage").maybeSingle(),
    db.from("audit_log").select("id,action,table_name,created_at,profiles(full_name)").order("created_at", { ascending: false }).limit(8),
    db.from("events").select("id,name_kn,start_date,place").gte("end_date", today).order("start_date").limit(5),
  ]);

  type ViewRow = { day: string; views: number; post_id: string; posts: { title_kn: string } | null };
  const viewRows = (views.data || []) as unknown as ViewRow[];
  const perDay = sumBy(viewRows, (r) => r.day, (r) => r.views);
  const current = days(range), previous = days(range, range);
  const daily = current.map((day, i) => ({ day, value: perDay.get(day) || 0, previous: perDay.get(previous[i]) || 0 }));

  type EngagementRow = {
    day: string; post_id: string; views?: number; engaged_seconds: number;
    scroll_25: number; scroll_50: number; scroll_75: number; scroll_100: number;
    share_clicks: number; listen_plays: number; video_plays?: number;
  };
  const engagementRows = (engagement.data || []) as EngagementRow[];
  const inRange = engagementRows.filter((r) => r.day >= since);
  const before = engagementRows.filter((r) => r.day < since);
  const total = (rows: EngagementRow[], pick: (r: EngagementRow) => number) =>
    rows.reduce((sum, r) => sum + (pick(r) || 0), 0);
  const viewsTotal = daily.reduce((s, d) => s + d.value, 0);
  const viewsPrevious = daily.reduce((s, d) => s + d.previous, 0);
  const average = (rows: EngagementRow[], viewCount: number) =>
    viewCount ? Math.round(total(rows, (r) => Number(r.engaged_seconds)) / viewCount) : 0;

  const engagedByPost = sumBy(inRange, (r) => r.post_id, (r) => Number(r.engaged_seconds));
  const postViews = sumBy(viewRows.filter((r) => r.day >= since), (r) => r.post_id, (r) => r.views);
  const titles = new Map(viewRows.map((r) => [r.post_id, r.posts?.title_kn || ""]));
  const topPosts = [...postViews]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([id, value]) => ({ id, title: titles.get(id) || "", views: value, engagedSeconds: value ? Math.round((engagedByPost.get(id) || 0) / value) : 0 }));

  type TrafficRow = { source: string; device: string; views: number };
  const trafficRows = (traffic.data || []) as TrafficRow[];
  const slices = (map: Map<string, number>) =>
    [...map].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

  type AdRow = { day: string; impressions: number; clicks: number };
  const adRows = (adStats.data || []) as AdRow[];
  const adImpressions = sumBy(adRows, (r) => r.day, (r) => Number(r.impressions));
  const adClicks = sumBy(adRows, (r) => r.day, (r) => Number(r.clicks));

  type CategoryRow = { name_kn: string; post_categories: { count: number }[] };
  type AuditRow = { id: string; action: string; table_name: string; created_at: string; profiles: { full_name: string | null } | null };
  type EventRow = { id: string; name_kn: string; start_date: string; place: string | null };
  const homeLead = (homepage.data?.value as { lead_id?: string } | null)?.lead_id;
  const pending = [newSubmissions, pendingComments, pendingCommunity, pendingShops];

  return {
    today,
    range,
    sample: false,
    views: { total: viewsTotal, previous: viewsPrevious, daily },
    engaged: { averageSeconds: average(inRange, viewsTotal), previousAverage: average(before, viewsPrevious) },
    published: { total: published, inRange: publishedInRange },
    readers: { total: readers, inRange: readersInRange },
    counts: {
      drafts, scheduled, archived, upcomingEvents, activeAds, places,
      toReview: pending.every((v) => v === null) ? null : pending.reduce<number>((s, v) => s + (v || 0), 0),
    },
    status: [
      { key: "published", value: published || 0 },
      { key: "draft", value: drafts || 0 },
      { key: "scheduled", value: scheduled || 0 },
      { key: "archived", value: archived || 0 },
    ],
    sources: slices(sumBy(trafficRows, (r) => r.source || "direct", (r) => Number(r.views))),
    devices: slices(sumBy(trafficRows, (r) => r.device || "desktop", (r) => Number(r.views))),
    scroll: {
      views: viewsTotal,
      s25: total(inRange, (r) => r.scroll_25),
      s50: total(inRange, (r) => r.scroll_50),
      s75: total(inRange, (r) => r.scroll_75),
      s100: total(inRange, (r) => r.scroll_100),
    },
    interactions: {
      shares: total(inRange, (r) => r.share_clicks),
      listens: total(inRange, (r) => r.listen_plays),
      videos: total(inRange, (r) => r.video_plays || 0),
    },
    ads: {
      impressions: adRows.reduce((s, r) => s + Number(r.impressions), 0),
      clicks: adRows.reduce((s, r) => s + Number(r.clicks), 0),
      daily: current.map((day) => ({ day, impressions: adImpressions.get(day) || 0, clicks: adClicks.get(day) || 0 })),
    },
    topPosts,
    perCategory: ((categories.data || []) as unknown as CategoryRow[])
      .map((c) => ({ label: c.name_kn, value: c.post_categories?.[0]?.count || 0 }))
      .filter((c) => c.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 7),
    activity: ((audit.data || []) as unknown as AuditRow[]).map((r) => ({
      id: r.id, action: r.action, table: r.table_name, minutesAgo: Math.max(0, Math.round((Date.now() - Date.parse(r.created_at)) / 60000)), actor: r.profiles?.full_name || null,
    })),
    events: ((events.data || []) as EventRow[]).map((e) => ({ id: e.id, name: e.name_kn, start: e.start_date, daysUntil: Math.max(0, Math.round((Date.parse(e.start_date) - Date.parse(today)) / DAY)), place: e.place })),
    review: review(pending),
    recent: (recent.data || []) as DashboardData["recent"],
    setup: setup([
      (published || 0) > 0,
      (featured || 0) > 0 || !!homeLead,
      (places || 0) > 0,
      (upcomingEvents || 0) > 0,
      (activeAds || 0) > 0,
    ]),
  };
}

/** Clearly labelled preview numbers for reviewing the design before real traffic exists. */
export function sampleDashboard(range: Range): DashboardData {
  const wave = (i: number, base: number, swing: number, seed: number) =>
    Math.round(base + swing * Math.sin((i + seed) / 3.1) + swing * 0.45 * Math.cos((i * 7 + seed) / 5.3) + (i * base) / 160);
  const current = days(range);
  const daily = current.map((day, i) => ({ day, value: wave(i, 1450, 380, 2), previous: wave(i, 1180, 330, 5) }));
  const total = daily.reduce((s, d) => s + d.value, 0);
  const previous = daily.reduce((s, d) => s + d.previous, 0);
  const titles = [
    "ಶ್ರವಣಬೆಳಗೊಳ ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ: ಸಿದ್ಧತೆ ಆರಂಭ",
    "ಮೂಡುಬಿದಿರೆ ಸಾವಿರ ಕಂಬದ ಬಸದಿ ಕಲಾ ವೈಭವ",
    "ಚಾತುರ್ಮಾಸ ಪ್ರವಚನ ಮಾಲಿಕೆ ಇಂದಿನಿಂದ",
    "ಜೈನ ಮಿಲನ್ ರಾಜ್ಯ ಸಮ್ಮೇಳನದ ಮುಖ್ಯಾಂಶಗಳು",
    "ಪಂಚಕಲ್ಯಾಣ ಮಹೋತ್ಸವಕ್ಕೆ ಭಕ್ತರ ಸಾಗರ",
    "ವಿದ್ಯಾರ್ಥಿ ವೇತನ: ಅರ್ಜಿ ಆಹ್ವಾನ",
  ];
  return {
    today: isoDay(),
    range,
    sample: true,
    views: { total, previous, daily },
    engaged: { averageSeconds: 94, previousAverage: 81 },
    published: { total: 248, inRange: Math.round(range * 1.7) },
    readers: { total: 3120, inRange: Math.round(range * 14) },
    counts: { drafts: 12, scheduled: 4, archived: 31, upcomingEvents: 9, activeAds: 6, places: 214, toReview: 7 },
    status: [
      { key: "published", value: 248 },
      { key: "draft", value: 12 },
      { key: "scheduled", value: 4 },
      { key: "archived", value: 31 },
    ],
    sources: [
      { key: "whatsapp", value: Math.round(total * 0.38) },
      { key: "search", value: Math.round(total * 0.24) },
      { key: "direct", value: Math.round(total * 0.17) },
      { key: "facebook", value: Math.round(total * 0.12) },
      { key: "push", value: Math.round(total * 0.06) },
      { key: "other", value: Math.round(total * 0.03) },
    ],
    devices: [
      { key: "mobile", value: Math.round(total * 0.82) },
      { key: "desktop", value: Math.round(total * 0.18) },
    ],
    scroll: { views: total, s25: Math.round(total * 0.78), s50: Math.round(total * 0.56), s75: Math.round(total * 0.37), s100: Math.round(total * 0.21) },
    interactions: { shares: Math.round(total * 0.041), listens: Math.round(total * 0.018), videos: Math.round(total * 0.066) },
    ads: (() => {
      const adDaily = current.map((day, i) => ({ day, impressions: wave(i, 3900, 900, 1), clicks: wave(i, 46, 14, 4) }));
      return {
        impressions: adDaily.reduce((s, d) => s + d.impressions, 0),
        clicks: adDaily.reduce((s, d) => s + d.clicks, 0),
        daily: adDaily,
      };
    })(),
    topPosts: titles.map((title, i) => ({ id: "sample-" + i, title, views: Math.round(total * (0.16 - i * 0.022)), engagedSeconds: 140 - i * 14 })),
    perCategory: [
      { label: "ರಾಜ್ಯ ಜೈನ ಸುದ್ದಿಗಳು", value: 74 },
      { label: "ಪಂಚಕಲ್ಯಾಣಗಳು", value: 41 },
      { label: "ಜೈನ ಮಠಗಳು", value: 33 },
      { label: "ಜೈನ್ ಮಿಲನ್ ಸುದ್ದಿಗಳು", value: 29 },
      { label: "ಉಪಯುಕ್ತ ಮಾಹಿತಿ", value: 22 },
      { label: "ಮಹಾಮಸ್ತಕಾಭಿಷೇಕ", value: 18 },
    ],
    activity: [
      { id: "a1", action: "INSERT", table: "posts", minutesAgo: 12, actor: "Editor" },
      { id: "a2", action: "UPDATE", table: "posts", minutesAgo: 48, actor: "Admin" },
      { id: "a3", action: "INSERT", table: "events", minutesAgo: 180, actor: "Reporter" },
      { id: "a4", action: "UPDATE", table: "ads", minutesAgo: 360, actor: "Admin" },
      { id: "a5", action: "DELETE", table: "post_comments", minutesAgo: 1560, actor: "Moderator" },
    ],
    events: [
      { id: "e1", name: "ಪಂಚಕಲ್ಯಾಣ ಮಹೋತ್ಸವ", start: isoDay(-3), daysUntil: 3, place: "ಮೂಡುಬಿದಿರೆ" },
      { id: "e2", name: "ಜೈನ ಪರಂಪರೆ ಪರಿಚಯ", start: isoDay(-6), daysUntil: 6, place: "ಶ್ರವಣಬೆಳಗೊಳ" },
      { id: "e3", name: "ಯುವ ಸೇವಾ ವೇದಿಕೆ", start: isoDay(-11), daysUntil: 11, place: "ಮೈಸೂರು" },
    ],
    review: review([3, 2, 1, 1]),
    recent: titles.slice(0, 5).map((title_kn, i) => ({
      id: "r" + i, title_kn, status: ["published", "draft", "scheduled", "published", "published"][i], updated_at: new Date().toISOString(),
    })),
    setup: setup([true, true, true, true, true]),
  };
}
