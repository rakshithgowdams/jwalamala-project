# 04 — DATABASE (Supabase Postgres)

Create with `supabase migration new <name>`. Show SQL before applying. Local only.

## Migration order
001_extensions_enums · 002_taxonomy · 003_content · 004_events_people · 005_ads · 006_engagement · 007_system · 008_indexes · 009_functions · 010_triggers · 011_rls · 012_storage · 013_cron · seed.sql

## Extensions
pg_trgm, unaccent, pg_cron, pg_net.

## Enums
- user_role: reader, reporter, editor, ad_manager, admin
- post_type: article, video, short, gallery
- post_status: draft, in_review, scheduled, published, archived
- video_provider: youtube, facebook, none
- content_source: wordpress, dataset, manual
- slot_mode: manual, google, manual_then_google, off
- ad_status: draft, active, paused, expired
- ad_device: all, mobile, desktop
- submission_kind: news, event, advertise, contact
- submission_status: new, in_review, converted, replied, archived

Every table: `id uuid primary key default gen_random_uuid()` (unless composite), `created_at`, `updated_at` (trigger).

## Taxonomy
- categories: slug unique, name_kn, name_en, description_kn, parent_id → categories, sort_order, show_in_menu, show_on_home, color_hint, hide_ads bool, seo_title, seo_description, legacy_wp_id unique.
- tags: slug unique, name_kn, name_en.
- places: slug unique, name_kn, name_en, district_kn, district_en, lat, lng.

## Content
- authors: profile_id → profiles null, slug unique, name_kn, name_en, bio_kn, avatar_url.
- posts:
  type, status, slug unique, title_kn, title_en, title_translit, summary_kn,
  body_json jsonb, body_html, reading_minutes,
  featured_image_url, featured_image_alt_kn,
  video_provider, video_id, video_url unique, thumbnail_url, duration_seconds,
  is_live, live_started_at, is_featured, is_editors_pick, editors_pick_order,
  is_breaking, breaking_until timestamptz,
  is_sponsored, sponsor_name, hide_ads bool default false, allow_comments bool default false,
  event_id → events null, event_date date, event_end_date date, place_id → places null,
  author_id → authors null, created_by → profiles,
  published_at, scheduled_for, last_edited_at,
  seo_title, seo_description, og_image_url,
  view_count bigint default 0,
  source, legacy_wp_id unique, transcript,
  search_vector tsvector GENERATED (simple config: title_kn/title_en/title_translit A, summary_kn B, transcript C).
- post_categories(post_id, category_id, is_primary) PK(post_id, category_id); unique partial index on (post_id) where is_primary.
- post_tags(post_id, tag_id) PK both.
- key_points: post_id, seconds, label_kn, sort_order.
- gallery_images: post_id, image_url, caption_kn, sort_order.
- post_revisions: post_id, editor_id, snapshot jsonb.

## Events and people
- events: slug unique, name_kn, name_en, start_date, end_date, start_time, place_id, venue_kn, organiser_kn, description_kn, map_url, status ('upcoming','completed','cancelled'), cover_image_url.
- profiles: id → auth.users PK, full_name, phone, avatar_url, town, place_id, role user_role default 'reader', interests uuid[], notify jsonb (breaking, live, categories, reminders), is_blocked.

## Ads
- ad_slots: slot_key unique, name_kn, page_type, description, mode slot_mode, desktop_width, desktop_height, mobile_width, mobile_height, show_on_mobile, show_on_desktop, adsense_slot_id, adsense_format ('auto','fluid','in-article','rectangle','horizontal'), house_ad_id → ads null, max_per_page int default 1, sort_order, is_active.
- advertisers: name, contact_name, phone, email, gst_number, notes.
- ad_campaigns: advertiser_id, name, slug, starts_at, ends_at, budget_note, status ad_status.
- ads: campaign_id, advertiser_id, title, status ad_status, slot_keys text[], image_desktop_url, image_mobile_url, alt_kn, target_url, utm_campaign, device ad_device, priority int default 0, weight int default 1, starts_at, ends_at, target_category_ids uuid[], target_place_ids uuid[], target_pages text[], max_impressions bigint, max_clicks bigint, daily_impression_cap int, total_impressions bigint default 0, total_clicks bigint default 0, is_house_ad bool.
- ad_stats_daily: ad_id, slot_key, day date, device ad_device, impressions int, clicks int; PK(ad_id, slot_key, day, device).
- ad_click_guard: session_hash, ad_id, clicked_at (short-lived, cleaned by cron) — for 30s dedupe.

## Engagement
- bookmarks(user_id, post_id) PK.
- event_reminders(user_id, event_id, channel) PK.
- push_subscriptions: user_id null, endpoint unique, p256dh, auth, topics text[], user_agent, last_success_at.
- post_views_daily(post_id, day, views) PK(post_id, day).
- search_queries_daily(query_norm, day, count) PK — for popular searches.
- comments: post_id, user_id, body, status ('pending','approved','rejected'), parent_id.
- submissions: kind, name, phone, email, town, event_date, link, message, business_name, status, converted_post_id, ip_hash, handled_by.

## System
- site_settings(key PK, value jsonb): 'general', 'home_sections', 'ticker', 'live', 'social', 'ads', 'features', 'seo'.
- redirects(old_path unique, new_path, status_code default 301, hits).
- import_jobs, import_rows (see 05-BACKEND).
- audit_log: actor_id, action, table_name, record_id, diff jsonb.
- notifications_log: kind, post_id, sent_count, failed_count.

## Indexes
- posts: (status, published_at desc); (event_date); (type, status, published_at desc); partial (is_breaking) where is_breaking; partial (is_live) where is_live; partial (is_editors_pick) where is_editors_pick; (place_id); (author_id); (event_id).
- GIN: posts.search_vector; trigram on title_kn, title_en, title_translit; places.name_kn/name_en trigram.
- post_categories(category_id, post_id); post_tags(tag_id, post_id).
- ads: GIN on slot_keys; (status, starts_at, ends_at).
- ad_stats_daily(day); post_views_daily(day).

## Functions (fixed `search_path`, SECURITY DEFINER only where noted)
- current_role() / is_staff() / has_role(user_role) — definer.
- search_posts(q, mode, date_from, date_to, category_ids, p_type, place_id, author_id, sort, p_limit, p_offset) → posts + rank + total_count.
- search_suggest(q, p_limit) → titles, categories, places.
- get_home_feed() → json with all home sections (one round-trip).
- related_posts(post_id, p_limit).
- trending_posts(hours, p_limit), most_viewed(days, p_limit), on_this_day(p_limit).
- increment_view(post_id) — definer; upserts post_views_daily.
- pick_manual_ad(slot_key, page_type, category_ids, place_id, device) → one ad row — definer (reads ads + stats, returns only public fields).
- record_ad_events(events jsonb) — definer; validates ad ids and slot keys; upserts ad_stats_daily; increments totals; caps batch size at 50.
- record_ad_click(ad_id, slot_key, device, session_hash) → target_url — definer; dedupe via ad_click_guard.
- publish_scheduled_posts(), expire_breaking(), expire_ads() — for cron.
- handle_new_user() trigger.

## Triggers
updated_at on all tables; handle_new_user on auth.users; audit trigger on posts, categories, ads, ad_slots, site_settings, profiles(role); reading_minutes + title_translit fill on posts insert/update (translit via app code if SQL is not practical); single-primary-category guard.

## RLS policies (enable on EVERY table)
Content (posts, post_categories, post_tags, key_points, gallery_images, categories, tags, places, authors, events):
- anon/auth SELECT: posts where status='published' and published_at <= now(); child rows only for published posts; taxonomy all.
- staff SELECT all.
- reporter INSERT posts (created_by = auth.uid(), status in draft/in_review); UPDATE own non-published posts.
- editor/admin: full INSERT/UPDATE; DELETE admin only.
Ads:
- ad_slots: public SELECT active slots (no sensitive fields); ad_manager/admin write.
- ads, ad_campaigns, advertisers, ad_stats_daily, ad_click_guard: NO public select (public gets ads only via pick_manual_ad); ad_manager/admin full access; editors read-only reports.
Engagement:
- bookmarks, event_reminders: own rows only.
- push_subscriptions: insert anon/auth; select/delete own or admin.
- comments: public select approved; auth insert own (status pending); editors moderate.
- submissions: insert only via Edge Function (service role); staff select/update.
- post_views_daily, search_queries_daily: staff select; writes via definer functions.
System:
- site_settings: public select keys general, home_sections, ticker, live, social, features, and the PUBLIC part of ads (store secrets elsewhere); admin write.
- redirects: public select; admin write.
- import_*, audit_log, notifications_log, post_revisions: staff only.
- profiles: own select/update (role column protected by trigger); staff select; admin update role.

## Storage buckets
- `site-assets` (public read, staff write, images ≤ 1 MB).
- `ad-creatives` (public read, ad_manager/admin write, images ≤ 300 KB).
No video storage.

## Cron (pg_cron)
- every 5 min: publish_scheduled_posts, expire_breaking
- hourly: expire_ads, clean ad_click_guard older than 1 hour
- daily 07:00 IST: call event-reminders function (pg_net)
- daily 08:00 IST: call ads-alerts function

## Seed
- 12 sample Kannada categories, 10 places (Hassan, Shravanabelagola, Moodbidri, Karkala, Humcha, Dharmasthala, Venur, Kanakagiri, Hombuja, Mysuru), 30 posts (mixed types, event dates, multiple categories), 6 events, 3 authors, all ad_slots from 03-ADS.md, 1 advertiser + campaign + 3 manual ads (one expired, one future, one active), site_settings defaults, 1 admin user. Prefix seed slugs with `seed-`.
