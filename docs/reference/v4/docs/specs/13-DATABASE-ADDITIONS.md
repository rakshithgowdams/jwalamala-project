# 13 — DATABASE ADDITIONS (v4)

Add as new migrations 014+ (never edit already-applied migrations). Same conventions as 04: uuid ids, timestamps, RLS on every table, show SQL before applying.

## Enum changes
- post_type add: liveblog, audio, story (web story), notice
- user_role add: editor_in_chief, sub_editor, contributor, moderator, analyst
- post_status add: idea, assigned, changes_requested, approved
- new: article_label (report, opinion, analysis, sponsored, factcheck, explainer, interview)
- new: notice_type (shraddhanjali, abhinandane, amantrana, anniversary, sanmana, student_achievement)
- new: trending_item_type (tag, topic, page, category, external, live)

## Column additions
- posts: label article_label default 'report', factcheck_verdict text, summary_points jsonb, body_en, embargo_until, assigned_to, deadline_at, priority int, locked_by, locked_at, image_layout text ('single','split2','collage3','video'), image_credit, audio_enabled bool default true, series_id, topic_ids uuid[], corrections jsonb, meaningful_update_at.
- places: lat numeric, lng numeric, is_district bool, show_in_weather bool, timezone text default 'Asia/Kolkata'.
- tags: is_hidden_from_trending bool, merged_into_id uuid, follower_count int.
- authors: role_kn, credentials_kn, social jsonb, is_contributor bool.
- profiles: preferred_place_id, ui_language ('kn','en'), newsletter_opt_in bool, quiet_hours jsonb.

## New tables
Taxonomy/content
- topics: slug, title_kn, title_en, intro_kn, cover_url, key_facts jsonb, is_active, show_in_trending, liveblog_post_id, tag_ids uuid[], sort_order.
- topic_pins: topic_id, post_id, sort_order.
- trending_items: label_kn, url, type trending_item_type, ref_id, icon, is_highlight, starts_at, ends_at, sort_order, is_active.
- series: slug, title_kn, description_kn, cover_url, is_active. series_items: series_id, post_id, episode_no.
- liveblog_updates: post_id, author_id, body_html, media jsonb, is_key, is_pinned, published_at.
- post_audio: post_id unique, audio_url, duration_seconds, voice, pace, text_hash, chars_used, status ('pending','ready','failed','disabled'), error.
- web_stories: slug, title_kn, cover_url, slides jsonb, status, published_at, linked_post_id.
- corrections_log: post_id, note_kn, created_by, created_at.
- polls: question_kn, options jsonb, multi bool, ends_at, status, post_id null. poll_votes: poll_id, option_index, user_id null, device_hash; unique (poll_id, device_hash).
- quizzes: title_kn, questions jsonb, status. quiz_attempts: quiz_id, score, device_hash.
- reactions: post_id, kind ('namana','useful','sad'), device_hash; unique (post_id, device_hash); post_reaction_counts view/materialized counts.
Community
- notices: type notice_type, title_kn, person_name, photo_url, body_kn, place_id, event_date, contact, submitted_by, status ('pending','approved','rejected'), is_paid, published_at.
- notice_messages: notice_id, name, message, status.
- opportunities: title_kn, org, kind ('job','scholarship','competition','admission'), place_id, last_date, link, contact, status.
- basadis: slug, name_kn, name_en, place_id, deity_kn, history_kn, timings_kn, contact, lat, lng, photos jsonb, status.
Live data
- weather_snapshots: place_id, fetched_at, current jsonb, hourly jsonb, daily jsonb, provider; unique (place_id) latest + history table weather_history (optional).
- aqi_snapshots: place_id, fetched_at, pm25, pm10, o3, no2, so2, co, naqi int, category text, hourly jsonb.
- jain_calendar_days: date, title_kn, kind ('parva','tithi','festival','note'), description_kn, is_major; index on date.
- reservoir_readings: reservoir_slug, name_kn, reading_date, full_level_m, level_m, storage_pct, inflow_cusecs, outflow_cusecs, last_year_level_m, source, entered_by.
- market_rates: rate_date, kind ('gold22','gold24','silver','petrol','diesel'), place_id null, value numeric, unit, source.
Engagement/growth
- follows: user_id, target_type ('category','tag','topic','place','author','series'), target_id; PK all three.
- reading_history: user_id, post_id, last_viewed_at, progress; keep latest 200 per user (trigger).
- newsletter_subscribers: email unique, status ('pending','active','unsubscribed'), token, preferences jsonb, confirmed_at.
- newsletter_issues: subject, html, status, sent_at, stats jsonb.
- push_events: notification_id, kind ('sent','clicked'), day, count.
- page_pulse: session_hash, post_id, last_seen_at (TTL 10 min, cron cleanup).
- post_engagement_daily: post_id, day, engaged_seconds, scroll_25, scroll_50, scroll_75, scroll_100, listen_plays, share_clicks.
Newsroom
- role_permissions: role, permission, allowed.
- story_comments: post_id, author_id, paragraph_index null, body, resolved.
- ai_suggestions: post_id, user_id, kind, input_hash, output jsonb, accepted bool, tokens, cost.
- social_accounts: network, page_id, token_encrypted, status. social_posts: post_id, network, caption, status, external_url, error.
Monetization (P2)
- supporters: user_id, tier, status, started_at, ends_at. payments: supporter_id, provider, provider_ref unique, amount, currency, status, raw jsonb.
- sites (P2 multi-site).

## RLS summary for new tables
- Public read: topics(active), topic_pins, trending_items(active & in time), series(active), series_items, liveblog_updates (post published), post_audio (ready & post published), web_stories (published), corrections_log (post published), polls (active), notices (approved), notice_messages (approved), opportunities (approved & not expired), basadis (published), weather/aqi snapshots, jain_calendar_days, reservoir_readings, market_rates.
- Write via SECURITY DEFINER RPC only (rate-limited): poll votes, quiz attempts, reactions, page_pulse, engagement, newsletter signup/confirm, notice submissions (through Edge Function with Turnstile).
- Own rows: follows, reading_history.
- Staff by permission: everything else. ai_suggestions and social_accounts: admin + owner only; token column never selectable by clients (use a view without the token).

## New functions
- get_trending_bar(), get_topic_page(slug), get_liveblog(post_id, after timestamptz), my_feed(p_limit, p_offset), vote_poll(poll_id, option, device_hash), react(post_id, kind, device_hash), record_engagement(batch jsonb), pulse(post_id, session_hash), live_readers(), naqi_category(values), jain_times(place_id, date) (optional SQL mirror of app calc), next_parva_days(n), weather_for(place_slug).

## New storage buckets
- article-audio (public read, service write, mp3 only).
- notices (public read, moderator write, images ≤ 1 MB).
- basadis (public read, editor write, images ≤ 1 MB).

## New cron jobs
- */30 min fetch-weather · */10 min cleanup page_pulse · hourly expire trending items/opportunities · daily 05:00 IST refresh jain times cache · daily 06:30 & 18:30 bulletin drafts · daily newsletter send (if enabled) · daily AI/TTS budget check.
