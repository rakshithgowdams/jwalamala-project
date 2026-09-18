export type Tag = {
  id: string;
  slug: string;
  name_kn: string;
  name_en?: string;
  merged_into_id?: string | null;
  is_hidden_from_trending?: boolean;
};
export type Place = {
  id: string;
  slug: string;
  name_kn: string;
  name_en: string;
  district: string;
  state?: string;
  lat: number | null;
  lng: number | null;
  show_in_weather: boolean;
  is_district?: boolean;
};
export type Author = {
  id: string;
  slug: string;
  name_kn: string;
  role_kn: string;
  bio_kn: string;
  credentials_kn: string;
  photo_url: string | null;
  is_active: boolean;
};
export type Topic = {
  id: string;
  slug: string;
  title_kn: string;
  intro_kn: string;
  cover_url: string;
  key_facts: string[];
  tag_ids: string[];
  timeline: { date: string; text: string }[];
  event_ids: string[];
  liveblog_post_id: string | null;
  is_active: boolean;
  sort_order: number;
};
export type TrendingItem = {
  id: string;
  label_kn: string;
  url: string;
  type: "tag" | "topic" | "page" | "category" | "external" | "live";
  is_highlight: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
};
export type Series = {
  id: string;
  slug: string;
  title_kn: string;
  description_kn: string;
  cover_url: string;
  is_active: boolean;
};
export type SeriesItem = {
  series_id: string;
  post_id: string;
  episode_no: number;
};
export type TopicPin = {
  topic_id: string;
  post_id: string;
  sort_order: number;
};
export type PostTag = { post_id: string; tag_id: string };
export type CalendarDay = {
  id: string;
  date: string;
  title_kn: string;
  kind: "parva" | "tithi" | "festival" | "note";
  description_kn: string;
  is_major: boolean;
  is_seed: boolean;
};
export type Basadi = {
  id: string;
  slug: string;
  name_kn: string;
  name_en: string;
  place_id: string;
  deity_kn: string;
  history_kn: string;
  timings_kn: string;
  contact: string;
  lat: number | null;
  lng: number | null;
  photos: { url: string; credit: string }[];
  status: "draft" | "published";
  is_seed: boolean;
};
export type Notice = {
  id: string;
  slug: string;
  type:
    | "shraddhanjali"
    | "abhinandane"
    | "amantrana"
    | "anniversary"
    | "sanmana"
    | "student_achievement";
  title_kn: string;
  person_name: string;
  photo_url: string | null;
  body_kn: string;
  place_id: string;
  event_date: string;
  contact: string;
  status: "pending" | "approved" | "rejected";
  published_at: string | null;
  is_seed: boolean;
};
export type Opportunity = {
  id: string;
  slug: string;
  title_kn: string;
  org: string;
  kind: "job" | "scholarship" | "competition" | "admission";
  place_id: string;
  last_date: string;
  link: string | null;
  contact: string;
  description_kn: string;
  status: "pending" | "approved" | "rejected";
  is_seed: boolean;
};
export type LiveBlog = {
  id: string;
  slug: string;
  title_kn: string;
  summary_kn: string;
  cover_url: string;
  event_date: string;
  is_live: boolean;
  status: "draft" | "published";
  published_at: string;
  is_seed: boolean;
};
export type LiveUpdate = {
  id: string;
  liveblog_id: string;
  body_html: string;
  is_key: boolean;
  is_pinned: boolean;
  published_at: string;
  media: { type: "image" | "video"; url: string; credit: string } | null;
};
export type Poll = {
  multiple_choice?: boolean;
  id: string;
  question_kn: string;
  options: string[];
  ends_at: string;
  status: "draft" | "active" | "closed";
  is_seed: boolean;
};
export type Quiz = {
  id: string;
  slug: string;
  title_kn: string;
  questions: {
    question: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
  status: "draft" | "published";
  is_seed: boolean;
};
export type Gallery = {
  id: string;
  slug: string;
  title_kn: string;
  description_kn: string;
  images: { url: string; caption: string; credit: string }[];
  event_date: string;
  status: "draft" | "published";
  is_seed: boolean;
};
export type WebStory = {
  id: string;
  slug: string;
  title_kn: string;
  cover_url: string;
  slides: { image: string; text: string; credit: string; href?: string }[];
  status: "draft" | "published";
  published_at: string;
  is_seed: boolean;
};
export type ReservoirReading = {
  id: string;
  reservoir_slug: string;
  name_kn: string;
  reading_date: string;
  full_level_m: number;
  level_m: number;
  storage_pct: number;
  inflow_cusecs: number;
  outflow_cusecs: number;
  source: string;
  is_seed: boolean;
};
export type MarketRate = {
  id: string;
  rate_date: string;
  kind: "gold22" | "gold24" | "silver" | "petrol" | "diesel";
  place_id: string | null;
  value: number;
  unit: string;
  source: string;
  is_seed: boolean;
};
export type Correction = {
  id: string;
  post_id: string;
  note_kn: string;
  created_at: string;
};
export type DataTables = {
  tags: Tag;
  places: Place;
  authors: Author;
  topics: Topic;
  trending_items: TrendingItem;
  series: Series;
  series_items: SeriesItem;
  topic_pins: TopicPin;
  post_tags: PostTag;
  jain_calendar_days: CalendarDay;
  basadis: Basadi;
  notices: Notice;
  opportunities: Opportunity;
  liveblogs: LiveBlog;
  liveblog_updates: LiveUpdate;
  polls: Poll;
  quizzes: Quiz;
  galleries: Gallery;
  web_stories: WebStory;
  reservoir_readings: ReservoirReading;
  market_rates: MarketRate;
  corrections_log: Correction;
};
export type PublicTable = keyof DataTables;
