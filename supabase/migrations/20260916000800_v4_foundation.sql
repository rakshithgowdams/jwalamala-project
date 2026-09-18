-- v4 additive schema. Review before applying to LOCAL Supabase. No deployment or database execution performed.
alter table public.tags add column if not exists is_hidden_from_trending boolean not null default false;
alter table public.tags add column if not exists merged_into_id uuid references public.tags(id);
alter table public.tags add constraint tag_not_self_merge check(merged_into_id is distinct from id);

create table public.places (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name_kn text not null, name_en text not null default '', district text not null default '', lat double precision check(lat between -90 and 90), lng double precision check(lng between -180 and 180), is_district boolean not null default false, show_in_weather boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.places enable row level security;

create table public.authors (
 id uuid primary key default gen_random_uuid(), profile_id uuid references public.profiles(id), slug text not null unique, name_kn text not null, role_kn text not null default '', bio_kn text not null default '', credentials_kn text not null default '', photo_url text, social jsonb not null default '{}', is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.authors enable row level security;

create table public.topics (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, title_en text, intro_kn text not null default '', cover_url text not null default '/images/jwalamala-logo.jpg', key_facts jsonb not null default '[]', tag_ids uuid[] not null default '{}', timeline jsonb not null default '[]', event_ids uuid[] not null default '{}', liveblog_post_id uuid, is_active boolean not null default false, sort_order integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.topics enable row level security;

create table public.topic_pins (
 topic_id uuid references public.topics(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, sort_order integer not null default 0, primary key(topic_id,post_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.topic_pins enable row level security;

create table public.trending_items (
 id uuid primary key default gen_random_uuid(), label_kn text not null, url text not null, type text not null check(type in ('tag','topic','page','category','external','live')), is_highlight boolean not null default false, starts_at timestamptz, ends_at timestamptz, sort_order integer not null default 0, is_active boolean not null default false, check(ends_at is null or starts_at is null or ends_at>starts_at),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.trending_items enable row level security;

create table public.series (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, description_kn text not null default '', cover_url text not null default '/images/jwalamala-logo.jpg', is_active boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.series enable row level security;

create table public.series_items (
 series_id uuid references public.series(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, episode_no integer not null check(episode_no>0), primary key(series_id,post_id), unique(series_id,episode_no),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.series_items enable row level security;

create table public.jain_calendar_days (
 id uuid primary key default gen_random_uuid(), date date not null, title_kn text not null, kind text not null check(kind in ('parva','tithi','festival','note')), description_kn text not null default '', is_major boolean not null default false, is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.jain_calendar_days enable row level security;

create table public.basadis (
 id uuid primary key default gen_random_uuid(), slug text not null unique, name_kn text not null, name_en text not null default '', place_id uuid references public.places(id), deity_kn text not null default '', history_kn text not null default '', timings_kn text not null default '', contact text not null default '', lat double precision check(lat between -90 and 90), lng double precision check(lng between -180 and 180), photos jsonb not null default '[]', status text not null default 'draft' check(status in ('draft','published')), is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.basadis enable row level security;

create table public.notices (
 id uuid primary key default gen_random_uuid(), slug text not null unique, type text not null check(type in ('shraddhanjali','abhinandane','amantrana','anniversary','sanmana','student_achievement')), title_kn text not null, person_name text not null default '', photo_url text, body_kn text not null default '', place_id uuid references public.places(id), event_date date not null, contact text not null default '', status text not null default 'pending' check(status in ('pending','approved','rejected')), published_at timestamptz, is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.notices enable row level security;

create table public.opportunities (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, org text not null default '', kind text not null check(kind in ('job','scholarship','competition','admission')), place_id uuid references public.places(id), last_date date not null, link text, contact text not null default '', description_kn text not null default '', status text not null default 'pending' check(status in ('pending','approved','rejected')), is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.opportunities enable row level security;

create table public.community_submissions (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('notice','opportunity','condolence')), payload jsonb not null, status text not null default 'pending' check(status in ('pending','approved','rejected')), ip_hash text not null, reviewed_by uuid references public.profiles(id), published_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.community_submissions enable row level security;

create table public.notice_messages (
 id uuid primary key default gen_random_uuid(), notice_id uuid not null references public.notices(id) on delete cascade, name text not null, message text not null, status text not null default 'pending' check(status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.notice_messages enable row level security;

create table public.liveblogs (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, summary_kn text not null default '', cover_url text not null default '/images/jwalamala-logo.jpg', event_date date not null, is_live boolean not null default true, status text not null default 'draft' check(status in ('draft','published')), published_at timestamptz, ended_at timestamptz, is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.liveblogs enable row level security;

create table public.liveblog_updates (
 id uuid primary key default gen_random_uuid(), liveblog_id uuid not null references public.liveblogs(id) on delete cascade, author_id uuid references public.profiles(id), body_html text not null, is_key boolean not null default false, is_pinned boolean not null default false, published_at timestamptz not null default now(), media jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.liveblog_updates enable row level security;

create table public.galleries (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, description_kn text not null default '', images jsonb not null default '[]', event_date date not null, status text not null default 'draft' check(status in ('draft','published')), is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.galleries enable row level security;

create table public.web_stories (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, cover_url text not null, slides jsonb not null default '[]', status text not null default 'draft' check(status in ('draft','published')), published_at timestamptz, is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.web_stories enable row level security;

create table public.polls (
 id uuid primary key default gen_random_uuid(), question_kn text not null, options jsonb not null check(jsonb_array_length(options) between 2 and 8), ends_at timestamptz not null, status text not null default 'draft' check(status in ('draft','active','closed')), post_id uuid references public.posts(id), is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.polls enable row level security;

create table public.poll_votes (
 id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.polls(id) on delete cascade, option_index integer not null check(option_index>=0), user_id uuid references public.profiles(id), device_hash text not null, unique(poll_id,device_hash),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.poll_votes enable row level security;

create table public.quizzes (
 id uuid primary key default gen_random_uuid(), slug text not null unique, title_kn text not null, questions jsonb not null default '[]', status text not null default 'draft' check(status in ('draft','published')), is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.quizzes enable row level security;

create table public.quiz_attempts (
 id uuid primary key default gen_random_uuid(), quiz_id uuid not null references public.quizzes(id) on delete cascade, score integer not null check(score>=0), device_hash text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.quiz_attempts enable row level security;

create table public.reactions (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, kind text not null check(kind in ('namana','useful','sad')), user_id uuid references public.profiles(id), device_hash text not null, unique(post_id,device_hash),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.reactions enable row level security;

create table public.follows (
 user_id uuid not null references public.profiles(id) on delete cascade, target_type text not null check(target_type in ('category','tag','topic','place','author','series')), target_id uuid not null, label_kn text not null default '', primary key(user_id,target_type,target_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.follows enable row level security;

create table public.reading_history (
 user_id uuid not null references public.profiles(id) on delete cascade, post_id uuid not null references public.posts(id) on delete cascade, last_viewed_at timestamptz not null default now(), progress numeric not null default 0 check(progress between 0 and 1), primary key(user_id,post_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.reading_history enable row level security;

create table public.newsletter_subscribers (
 id uuid primary key default gen_random_uuid(), email text not null unique, status text not null default 'pending' check(status in ('pending','active','unsubscribed')), token_hash text not null, token_expires_at timestamptz not null, unsubscribe_hash text not null, preferences jsonb not null default '{}', confirmed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;

create table public.newsletter_issues (
 id uuid primary key default gen_random_uuid(), subject text not null, html text not null, status text not null default 'draft' check(status in ('draft','queued','sent','failed')), sent_at timestamptz, stats jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.newsletter_issues enable row level security;

create table public.weather_snapshots (
 place_id uuid primary key references public.places(id) on delete cascade, fetched_at timestamptz not null default now(), current jsonb not null, hourly jsonb not null default '[]', daily jsonb not null default '[]', provider text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.weather_snapshots enable row level security;

create table public.aqi_snapshots (
 place_id uuid primary key references public.places(id) on delete cascade, fetched_at timestamptz not null default now(), pollutants jsonb not null default '{}', naqi integer check(naqi between 0 and 500), category text, hourly jsonb not null default '[]', provider text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.aqi_snapshots enable row level security;

create table public.reservoir_readings (
 id uuid primary key default gen_random_uuid(), reservoir_slug text not null, name_kn text not null, reading_date date not null, full_level_m numeric not null, level_m numeric not null, storage_pct numeric not null check(storage_pct between 0 and 100), inflow_cusecs numeric not null default 0, outflow_cusecs numeric not null default 0, source text not null, is_seed boolean not null default false, unique(reservoir_slug,reading_date),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.reservoir_readings enable row level security;

create table public.market_rates (
 id uuid primary key default gen_random_uuid(), rate_date date not null, kind text not null check(kind in ('gold22','gold24','silver','petrol','diesel')), place_id uuid references public.places(id), value numeric not null check(value>=0), unit text not null, source text not null, is_seed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.market_rates enable row level security;

create table public.corrections_log (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, note_kn text not null, created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.corrections_log enable row level security;

create table public.post_audio (
 id uuid primary key default gen_random_uuid(), post_id uuid not null unique references public.posts(id) on delete cascade, audio_url text, duration_seconds numeric, voice text, pace numeric, text_hash text not null, chars_used integer not null default 0, status text not null default 'pending' check(status in ('pending','ready','failed','disabled')), error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.post_audio enable row level security;

create table public.role_permissions (
 role text not null, permission text not null, allowed boolean not null default false, primary key(role,permission),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.role_permissions enable row level security;

create table public.story_assignments (
 id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id), title_kn text not null, assigned_to uuid references public.profiles(id), deadline_at timestamptz, embargo_until timestamptz, priority integer not null default 1 check(priority between 1 and 3), status text not null default 'idea' check(status in ('idea','assigned','draft','review','changes_requested','approved','published')), checklist jsonb not null default '{}', notes text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.story_assignments enable row level security;

create table public.story_comments (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, author_id uuid not null references public.profiles(id), paragraph_index integer, body text not null, resolved boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.story_comments enable row level security;

create table public.post_versions (
 id uuid primary key default gen_random_uuid(), post_id uuid not null references public.posts(id) on delete cascade, author_id uuid references public.profiles(id), snapshot jsonb not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.post_versions enable row level security;

create table public.ai_suggestions (
 id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id), user_id uuid not null references public.profiles(id), kind text not null, input_hash text not null, output jsonb not null, accepted boolean not null default false, tokens integer not null default 0, cost numeric not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ai_suggestions enable row level security;

create table public.social_accounts (
 id uuid primary key default gen_random_uuid(), network text not null check(network in ('facebook','telegram')), page_id text not null, token_encrypted text not null, status text not null default 'disabled',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.social_accounts enable row level security;

create table public.social_posts (
 id uuid primary key default gen_random_uuid(), post_id uuid references public.posts(id), network text not null check(network in ('facebook','telegram')), caption text not null, status text not null default 'draft' check(status in ('draft','queued','published','failed')), external_url text, error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.social_posts enable row level security;

create table public.provider_settings (
 id text primary key, enabled boolean not null default false, monthly_limit numeric not null default 0 check(monthly_limit>=0), unit text not null default 'requests', options jsonb not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.provider_settings enable row level security;

create table public.provider_usage (
 provider_id text not null references public.provider_settings(id), month date not null, used numeric not null default 0 check(used>=0), primary key(provider_id,month),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.provider_usage enable row level security;

create table public.automation_jobs (
 id uuid primary key default gen_random_uuid(), kind text not null, payload jsonb not null default '{}', status text not null default 'pending' check(status in ('pending','running','done','failed')), attempts integer not null default 0, locked_at timestamptz, run_after timestamptz not null default now(), last_error text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.automation_jobs enable row level security;

create table public.page_pulse (
 session_hash text not null, post_id uuid not null references public.posts(id) on delete cascade, last_seen_at timestamptz not null default now(), primary key(session_hash,post_id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.page_pulse enable row level security;

create table public.post_engagement_daily (
 post_id uuid not null references public.posts(id) on delete cascade, day date not null, engaged_seconds bigint not null default 0, scroll_25 integer not null default 0, scroll_50 integer not null default 0, scroll_75 integer not null default 0, scroll_100 integer not null default 0, listen_plays integer not null default 0, share_clicks integer not null default 0, primary key(post_id,day),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.post_engagement_daily enable row level security;

create table public.push_events (
 id uuid primary key default gen_random_uuid(), notification_id uuid, kind text not null check(kind in ('sent','clicked')), day date not null, count integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.push_events enable row level security;

create table public.v4_rate_limits (
 bucket text primary key, window_start timestamptz not null default now(), hits integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.v4_rate_limits enable row level security;

alter table public.posts add column if not exists place_id uuid references public.places(id);
alter table public.posts add column if not exists public_author_id uuid references public.authors(id);
alter table public.posts add column if not exists label text not null default 'report' check(label in ('report','opinion','analysis','sponsored','factcheck','explainer','interview'));
alter table public.posts add column if not exists summary_points jsonb not null default '[]';
alter table public.posts add column if not exists image_credit text;
alter table public.posts add column if not exists image_layout text not null default 'single' check(image_layout in ('single','split2','collage3','video'));
alter table public.posts add column if not exists audio_enabled boolean not null default true;
alter table public.posts add column if not exists hide_ads boolean not null default false;
alter table public.posts add column if not exists embargo_until timestamptz;
alter table public.posts add column if not exists meaningful_update_at timestamptz;
alter table public.posts add column if not exists publish_checklist jsonb not null default '{}';
alter table public.posts add column if not exists locked_by uuid references public.profiles(id);
alter table public.posts add column if not exists locked_at timestamptz;
alter table public.profiles add column if not exists preferred_place_id uuid references public.places(id);
alter table public.profiles add column if not exists ui_language text not null default 'kn' check(ui_language in ('kn','en'));
alter table public.profiles add column if not exists quiet_hours jsonb not null default '{"start":22,"end":6,"max_daily":5}';

create function public.has_permission(requested text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles p where p.id=(select auth.uid()) and
 (p.role='admin' or exists(select 1 from public.role_permissions rp where rp.role=p.role::text and rp.permission=requested and rp.allowed)));
$$;
grant execute on function public.has_permission(text) to authenticated;
insert into public.role_permissions(role,permission,allowed)
select role,permission,true from unnest(array['editor','editor_in_chief','sub_editor']) role cross join unnest(array['admin.access','content.read','content.edit','content.publish','community.manage','newsletter.manage','social.manage','analytics.read','ads.manage']) permission;
insert into public.role_permissions(role,permission,allowed)
select role,permission,true from unnest(array['reporter','contributor']) role cross join unnest(array['admin.access','content.read','content.create']) permission;
insert into public.role_permissions(role,permission,allowed) values
 ('ad_manager','admin.access',true),('ad_manager','ads.manage',true),('moderator','admin.access',true),('moderator','community.manage',true),('analyst','admin.access',true),('analyst','analytics.read',true);
create policy public_read on public.places for select to anon,authenticated using(true);
grant select on public.places to anon,authenticated;
create policy staff_manage on public.places for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.places to authenticated;
create trigger audit_changes after insert or update or delete on public.places for each row execute function public.audit_content();
create trigger touch_update before update on public.places for each row execute function public.touch_updated_at();
create policy public_read on public.authors for select to anon,authenticated using(is_active);
grant select on public.authors to anon,authenticated;
create policy staff_manage on public.authors for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.authors to authenticated;
create trigger audit_changes after insert or update or delete on public.authors for each row execute function public.audit_content();
create trigger touch_update before update on public.authors for each row execute function public.touch_updated_at();
create policy public_read on public.topics for select to anon,authenticated using(is_active);
grant select on public.topics to anon,authenticated;
create policy staff_manage on public.topics for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.topics to authenticated;
create trigger audit_changes after insert or update or delete on public.topics for each row execute function public.audit_content();
create trigger touch_update before update on public.topics for each row execute function public.touch_updated_at();
create policy public_read on public.topic_pins for select to anon,authenticated using(exists(select 1 from public.topics t where t.id=topic_id and t.is_active) and exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.published_at<=now()));
grant select on public.topic_pins to anon,authenticated;
create policy staff_manage on public.topic_pins for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.topic_pins to authenticated;
create trigger audit_changes after insert or update or delete on public.topic_pins for each row execute function public.audit_content();
create trigger touch_update before update on public.topic_pins for each row execute function public.touch_updated_at();
create policy public_read on public.trending_items for select to anon,authenticated using(is_active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now()));
grant select on public.trending_items to anon,authenticated;
create policy staff_manage on public.trending_items for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.trending_items to authenticated;
create trigger audit_changes after insert or update or delete on public.trending_items for each row execute function public.audit_content();
create trigger touch_update before update on public.trending_items for each row execute function public.touch_updated_at();
create policy public_read on public.series for select to anon,authenticated using(is_active);
grant select on public.series to anon,authenticated;
create policy staff_manage on public.series for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.series to authenticated;
create trigger audit_changes after insert or update or delete on public.series for each row execute function public.audit_content();
create trigger touch_update before update on public.series for each row execute function public.touch_updated_at();
create policy public_read on public.series_items for select to anon,authenticated using(exists(select 1 from public.series s where s.id=series_id and s.is_active) and exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.published_at<=now()));
grant select on public.series_items to anon,authenticated;
create policy staff_manage on public.series_items for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.series_items to authenticated;
create trigger audit_changes after insert or update or delete on public.series_items for each row execute function public.audit_content();
create trigger touch_update before update on public.series_items for each row execute function public.touch_updated_at();
create policy public_read on public.jain_calendar_days for select to anon,authenticated using(true);
grant select on public.jain_calendar_days to anon,authenticated;
create policy staff_manage on public.jain_calendar_days for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.jain_calendar_days to authenticated;
create trigger audit_changes after insert or update or delete on public.jain_calendar_days for each row execute function public.audit_content();
create trigger touch_update before update on public.jain_calendar_days for each row execute function public.touch_updated_at();
create policy public_read on public.basadis for select to anon,authenticated using(status='published');
grant select on public.basadis to anon,authenticated;
create policy staff_manage on public.basadis for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,insert,update,delete on public.basadis to authenticated;
create trigger audit_changes after insert or update or delete on public.basadis for each row execute function public.audit_content();
create trigger touch_update before update on public.basadis for each row execute function public.touch_updated_at();
create policy public_read on public.notices for select to anon,authenticated using(status='approved' and published_at<=now());
grant select on public.notices to anon,authenticated;
create policy staff_manage on public.notices for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,insert,update,delete on public.notices to authenticated;
create trigger audit_changes after insert or update or delete on public.notices for each row execute function public.audit_content();
create trigger touch_update before update on public.notices for each row execute function public.touch_updated_at();
create policy public_read on public.opportunities for select to anon,authenticated using(status='approved' and last_date>=(now() at time zone 'Asia/Kolkata')::date);
grant select on public.opportunities to anon,authenticated;
create policy staff_manage on public.opportunities for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,insert,update,delete on public.opportunities to authenticated;
create trigger audit_changes after insert or update or delete on public.opportunities for each row execute function public.audit_content();
create trigger touch_update before update on public.opportunities for each row execute function public.touch_updated_at();
create policy staff_manage on public.community_submissions for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,insert,update,delete on public.community_submissions to authenticated;
create trigger audit_changes after insert or update or delete on public.community_submissions for each row execute function public.audit_content();
create trigger touch_update before update on public.community_submissions for each row execute function public.touch_updated_at();
create policy public_read on public.notice_messages for select to anon,authenticated using(status='approved' and exists(select 1 from public.notices n where n.id=notice_id and n.status='approved' and n.published_at<=now()));
grant select on public.notice_messages to anon,authenticated;
create policy staff_manage on public.notice_messages for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,insert,update,delete on public.notice_messages to authenticated;
create trigger audit_changes after insert or update or delete on public.notice_messages for each row execute function public.audit_content();
create trigger touch_update before update on public.notice_messages for each row execute function public.touch_updated_at();
create policy public_read on public.liveblogs for select to anon,authenticated using(status='published' and published_at<=now());
grant select on public.liveblogs to anon,authenticated;
create policy staff_manage on public.liveblogs for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.liveblogs to authenticated;
create trigger audit_changes after insert or update or delete on public.liveblogs for each row execute function public.audit_content();
create trigger touch_update before update on public.liveblogs for each row execute function public.touch_updated_at();
create policy public_read on public.liveblog_updates for select to anon,authenticated using(published_at<=now() and exists(select 1 from public.liveblogs l where l.id=liveblog_id and l.status='published' and l.published_at<=now()));
grant select on public.liveblog_updates to anon,authenticated;
create policy staff_manage on public.liveblog_updates for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.liveblog_updates to authenticated;
create trigger audit_changes after insert or update or delete on public.liveblog_updates for each row execute function public.audit_content();
create trigger touch_update before update on public.liveblog_updates for each row execute function public.touch_updated_at();
create policy public_read on public.galleries for select to anon,authenticated using(status='published');
grant select on public.galleries to anon,authenticated;
create policy staff_manage on public.galleries for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.galleries to authenticated;
create trigger audit_changes after insert or update or delete on public.galleries for each row execute function public.audit_content();
create trigger touch_update before update on public.galleries for each row execute function public.touch_updated_at();
create policy public_read on public.web_stories for select to anon,authenticated using(status='published' and published_at<=now());
grant select on public.web_stories to anon,authenticated;
create policy staff_manage on public.web_stories for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.web_stories to authenticated;
create trigger audit_changes after insert or update or delete on public.web_stories for each row execute function public.audit_content();
create trigger touch_update before update on public.web_stories for each row execute function public.touch_updated_at();
create policy public_read on public.polls for select to anon,authenticated using(status in ('active','closed'));
grant select on public.polls to anon,authenticated;
create policy staff_manage on public.polls for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.polls to authenticated;
create trigger audit_changes after insert or update or delete on public.polls for each row execute function public.audit_content();
create trigger touch_update before update on public.polls for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.poll_votes for each row execute function public.touch_updated_at();
create policy public_read on public.quizzes for select to anon,authenticated using(status='published');
grant select on public.quizzes to anon,authenticated;
create policy staff_manage on public.quizzes for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.quizzes to authenticated;
create trigger audit_changes after insert or update or delete on public.quizzes for each row execute function public.audit_content();
create trigger touch_update before update on public.quizzes for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.quiz_attempts for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.reactions for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.follows for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.reading_history for each row execute function public.touch_updated_at();
create policy staff_manage on public.newsletter_subscribers for all to authenticated using(public.has_permission('newsletter.manage')) with check(public.has_permission('newsletter.manage'));
grant select,insert,update,delete on public.newsletter_subscribers to authenticated;
create trigger touch_update before update on public.newsletter_subscribers for each row execute function public.touch_updated_at();
create policy staff_manage on public.newsletter_issues for all to authenticated using(public.has_permission('newsletter.manage')) with check(public.has_permission('newsletter.manage'));
grant select,insert,update,delete on public.newsletter_issues to authenticated;
create trigger audit_changes after insert or update or delete on public.newsletter_issues for each row execute function public.audit_content();
create trigger touch_update before update on public.newsletter_issues for each row execute function public.touch_updated_at();
create policy public_read on public.weather_snapshots for select to anon,authenticated using(true);
grant select on public.weather_snapshots to anon,authenticated;
create trigger audit_changes after insert or update or delete on public.weather_snapshots for each row execute function public.audit_content();
create trigger touch_update before update on public.weather_snapshots for each row execute function public.touch_updated_at();
create policy public_read on public.aqi_snapshots for select to anon,authenticated using(true);
grant select on public.aqi_snapshots to anon,authenticated;
create trigger audit_changes after insert or update or delete on public.aqi_snapshots for each row execute function public.audit_content();
create trigger touch_update before update on public.aqi_snapshots for each row execute function public.touch_updated_at();
create policy public_read on public.reservoir_readings for select to anon,authenticated using(true);
grant select on public.reservoir_readings to anon,authenticated;
create policy staff_manage on public.reservoir_readings for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.reservoir_readings to authenticated;
create trigger audit_changes after insert or update or delete on public.reservoir_readings for each row execute function public.audit_content();
create trigger touch_update before update on public.reservoir_readings for each row execute function public.touch_updated_at();
create policy public_read on public.market_rates for select to anon,authenticated using(true);
grant select on public.market_rates to anon,authenticated;
create policy staff_manage on public.market_rates for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.market_rates to authenticated;
create trigger audit_changes after insert or update or delete on public.market_rates for each row execute function public.audit_content();
create trigger touch_update before update on public.market_rates for each row execute function public.touch_updated_at();
create policy public_read on public.corrections_log for select to anon,authenticated using(exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.published_at<=now()));
grant select on public.corrections_log to anon,authenticated;
create policy staff_manage on public.corrections_log for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.corrections_log to authenticated;
create trigger audit_changes after insert or update or delete on public.corrections_log for each row execute function public.audit_content();
create trigger touch_update before update on public.corrections_log for each row execute function public.touch_updated_at();
create policy public_read on public.post_audio for select to anon,authenticated using(status='ready' and exists(select 1 from public.posts p where p.id=post_id and p.status='published' and p.published_at<=now()));
grant select on public.post_audio to anon,authenticated;
create policy staff_manage on public.post_audio for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.post_audio to authenticated;
create trigger audit_changes after insert or update or delete on public.post_audio for each row execute function public.audit_content();
create trigger touch_update before update on public.post_audio for each row execute function public.touch_updated_at();
create policy staff_manage on public.role_permissions for all to authenticated using(public.has_permission('settings.manage')) with check(public.has_permission('settings.manage'));
grant select,insert,update,delete on public.role_permissions to authenticated;
create trigger audit_changes after insert or update or delete on public.role_permissions for each row execute function public.audit_content();
create trigger touch_update before update on public.role_permissions for each row execute function public.touch_updated_at();
create policy staff_manage on public.story_assignments for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.story_assignments to authenticated;
create trigger audit_changes after insert or update or delete on public.story_assignments for each row execute function public.audit_content();
create trigger touch_update before update on public.story_assignments for each row execute function public.touch_updated_at();
create policy staff_manage on public.story_comments for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.story_comments to authenticated;
create trigger audit_changes after insert or update or delete on public.story_comments for each row execute function public.audit_content();
create trigger touch_update before update on public.story_comments for each row execute function public.touch_updated_at();
create policy staff_manage on public.post_versions for all to authenticated using(public.has_permission('content.edit')) with check(public.has_permission('content.edit'));
grant select,insert,update,delete on public.post_versions to authenticated;
create trigger audit_changes after insert or update or delete on public.post_versions for each row execute function public.audit_content();
create trigger touch_update before update on public.post_versions for each row execute function public.touch_updated_at();
create trigger audit_changes after insert or update or delete on public.ai_suggestions for each row execute function public.audit_content();
create trigger touch_update before update on public.ai_suggestions for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.social_accounts for each row execute function public.touch_updated_at();
create policy staff_manage on public.social_posts for all to authenticated using(public.has_permission('social.manage')) with check(public.has_permission('social.manage'));
grant select,insert,update,delete on public.social_posts to authenticated;
create trigger audit_changes after insert or update or delete on public.social_posts for each row execute function public.audit_content();
create trigger touch_update before update on public.social_posts for each row execute function public.touch_updated_at();
create policy staff_manage on public.provider_settings for all to authenticated using(public.has_permission('settings.manage')) with check(public.has_permission('settings.manage'));
grant select,insert,update,delete on public.provider_settings to authenticated;
create trigger audit_changes after insert or update or delete on public.provider_settings for each row execute function public.audit_content();
create trigger touch_update before update on public.provider_settings for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.provider_usage for each row execute function public.touch_updated_at();
create trigger audit_changes after insert or update or delete on public.automation_jobs for each row execute function public.audit_content();
create trigger touch_update before update on public.automation_jobs for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.page_pulse for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.post_engagement_daily for each row execute function public.touch_updated_at();
create trigger audit_changes after insert or update or delete on public.push_events for each row execute function public.audit_content();
create trigger touch_update before update on public.push_events for each row execute function public.touch_updated_at();
create trigger touch_update before update on public.v4_rate_limits for each row execute function public.touch_updated_at();

create policy own_follows on public.follows for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy own_history on public.reading_history for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
grant select,insert,update,delete on public.follows,public.reading_history to authenticated;
create policy own_ai on public.ai_suggestions for select to authenticated using(user_id=(select auth.uid()) or public.has_role('admin'));
grant select on public.ai_suggestions to authenticated;
create policy usage_read on public.provider_usage for select to authenticated using(public.has_permission('settings.manage'));
grant select on public.provider_usage to authenticated;
create policy pulse_read on public.page_pulse for select to authenticated using(public.has_permission('analytics.read'));
create policy engagement_read on public.post_engagement_daily for select to authenticated using(public.has_permission('analytics.read'));
grant select on public.page_pulse,public.post_engagement_daily to authenticated;

create unique index poll_one_vote_per_user on public.poll_votes(poll_id,user_id) where user_id is not null;
create index liveblog_time on public.liveblog_updates(liveblog_id,published_at desc);
create index calendar_date on public.jain_calendar_days(date);
create index notices_publication on public.notices(status,published_at desc);
create index opportunity_expiry on public.opportunities(status,last_date);
create index pulse_last_seen on public.page_pulse(last_seen_at);
create index jobs_pending on public.automation_jobs(status,run_after);
create index history_recent on public.reading_history(user_id,last_viewed_at desc);

create function public.v4_rate_limit(bucket text,max_requests integer,window_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare current_hits integer;
begin
 if max_requests<1 or window_seconds<1 then return false; end if;
 insert into public.v4_rate_limits as limits(bucket,window_start,hits) values(v4_rate_limit.bucket,now(),1)
 on conflict on constraint v4_rate_limits_pkey do update set
 hits=case when limits.window_start<=now()-make_interval(secs=>window_seconds) then 1 else limits.hits+1 end,
 window_start=case when limits.window_start<=now()-make_interval(secs=>window_seconds) then now() else limits.window_start end
 returning hits into current_hits;
 return current_hits<=max_requests;
end; $$;
revoke all on function public.v4_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.v4_rate_limit(text,integer,integer) to service_role;

create function public.consume_provider_budget(provider text,amount numeric) returns boolean language plpgsql security definer set search_path='' as $$
declare config public.provider_settings; current_used numeric; period date:=(date_trunc('month',now() at time zone 'Asia/Kolkata'))::date;
begin
 if amount<=0 then return false; end if;
 select * into config from public.provider_settings where id=provider for update;
 if config is null or not config.enabled or config.monthly_limit<=0 then return false; end if;
 select used into current_used from public.provider_usage where provider_id=provider and month=period;
 if coalesce(current_used,0)+amount>config.monthly_limit then return false; end if;
 insert into public.provider_usage(provider_id,month,used) values(provider,period,amount)
 on conflict(provider_id,month) do update set used=public.provider_usage.used+excluded.used;
 return true;
end; $$;
revoke all on function public.consume_provider_budget(text,numeric) from public,anon,authenticated;
grant execute on function public.consume_provider_budget(text,numeric) to service_role;
insert into public.provider_settings(id,enabled,monthly_limit,unit) values
 ('weather',false,0,'requests'),('tts',false,0,'characters'),('ai',false,0,'tokens'),('email',false,0,'messages'),('social',false,0,'messages'),('push',false,0,'messages');

-- Service-only writes keep vote identifiers and subscriber tokens inaccessible to browser clients.
grant all on all tables in schema public to service_role;
