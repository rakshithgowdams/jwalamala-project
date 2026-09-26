-- Attribution lines, live updates and topic key facts catch up with the title columns. Kannada stays the source of record; empty string means "not translated yet".
alter table public.events add column if not exists organiser_en text not null default '';alter table public.events add column if not exists organiser_hi text not null default '';
alter table public.reservoir_readings add column if not exists source_en text not null default '';alter table public.reservoir_readings add column if not exists source_hi text not null default '';
alter table public.market_rates add column if not exists source_en text not null default '';alter table public.market_rates add column if not exists source_hi text not null default '';
alter table public.opportunities add column if not exists org_en text not null default '';alter table public.opportunities add column if not exists org_hi text not null default '';
-- The remaining leaks sit inside jsonb payloads (galleries.images, web_stories.slides, quizzes.questions, topics.timeline) and need no DDL, with two exceptions:
-- liveblog_updates.body_html is a plain text column, and topics.key_facts is a jsonb array whose translations are parallel top-level arrays, mirroring polls.options_en/_hi.
alter table public.liveblog_updates add column if not exists body_html_en text not null default '';alter table public.liveblog_updates add column if not exists body_html_hi text not null default '';
alter table public.topics add column if not exists key_facts_en jsonb not null default '[]'::jsonb;alter table public.topics add column if not exists key_facts_hi jsonb not null default '[]'::jsonb;
-- No function is recreated here. public.save_editor_post, save_editor_post_chapters, sponsor_content_hash and list_public_posts read public.posts, post_tags, key_points and places only; no routine in supabase/migrations references events.organiser, reservoir_readings.source, market_rates.source, liveblog_updates.body_html or topics.key_facts.
