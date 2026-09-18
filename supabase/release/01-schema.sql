-- Jwalamala v4: EMPTY Supabase project only. No sample records or secrets.
-- Migrations commit separately because enum additions must commit before use.
-- Stop and resolve errors before proceeding; do not rerun completed migrations.

-- 20260916000100_core.sql
BEGIN;
-- Review before applying. Local development only. No destructive statements.
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;
create type public.user_role as enum ('reader','reporter','editor','admin');
create type public.post_type as enum ('article','video','short');
create type public.post_status as enum ('draft','scheduled','published','archived');
create type public.video_provider as enum ('youtube','facebook','none');
create type public.content_source as enum ('wordpress','dataset','manual');
create type public.submission_status as enum ('new','in_review','converted','replied','archived');
create type public.ad_slot as enum ('home_banner','sidebar','in_article','category_top','event_sponsor');
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,full_name text,phone text,town text,avatar_url text,role public.user_role not null default 'reader',interests uuid[] not null default '{}',notify_push boolean not null default false,notify_whatsapp boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.categories(id uuid primary key default gen_random_uuid(),slug text not null unique,name_kn text not null,name_en text,description_kn text,parent_id uuid references public.categories(id),sort_order int not null default 0,show_in_menu boolean not null default true,legacy_wp_id int unique,is_seed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(parent_id is distinct from id));
create table public.events(id uuid primary key default gen_random_uuid(),slug text not null unique,name_kn text not null,name_en text,start_date date not null,end_date date not null,place text,district text,organiser text,status text not null default 'upcoming' check(status in ('upcoming','completed')),description_kn text,is_seed boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(end_date>=start_date));
create table public.posts(id uuid primary key default gen_random_uuid(),type public.post_type not null default 'article',status public.post_status not null default 'draft',slug text not null unique,title_kn text not null,title_en text,title_translit text,summary_kn text,body_json jsonb,body_html text not null default '',video_provider public.video_provider not null default 'none',video_id text,video_url text unique,thumbnail_url text,duration_seconds int check(duration_seconds>=0),is_live boolean not null default false,is_featured boolean not null default false,is_breaking boolean not null default false,event_id uuid references public.events(id),event_date date,event_place text,published_at timestamptz,scheduled_for timestamptz,author_id uuid references public.profiles(id),seo_title text,seo_description text,view_count bigint not null default 0,source public.content_source not null default 'manual',legacy_wp_id int unique,transcript text,is_seed boolean not null default false,
 search_vector tsvector generated always as (setweight(to_tsvector('simple',coalesce(title_kn,'')||' '||coalesce(title_en,'')||' '||coalesce(title_translit,'')),'A')||setweight(to_tsvector('simple',coalesce(summary_kn,'')),'B')||setweight(to_tsvector('simple',coalesce(transcript,'')),'C')) stored,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(status not in ('published','scheduled') or event_date is not null),
 check(status<>'published' or published_at is not null),
 check(status<>'scheduled' or scheduled_for is not null));
create table public.post_categories(post_id uuid references public.posts(id) on delete cascade,category_id uuid references public.categories(id),is_primary boolean not null default false,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(post_id,category_id));
create unique index one_primary_category on public.post_categories(post_id) where is_primary;
create table public.tags(id uuid primary key default gen_random_uuid(),slug text not null unique,name_kn text not null,name_en text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.post_tags(post_id uuid references public.posts(id) on delete cascade,tag_id uuid references public.tags(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(post_id,tag_id));
create table public.key_points(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id) on delete cascade,seconds int not null check(seconds>=0),label_kn text not null,sort_order int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index posts_publication_idx on public.posts(status,published_at desc);
create index posts_event_date_idx on public.posts(event_date);
create index posts_search_idx on public.posts using gin(search_vector);
create index posts_title_kn_idx on public.posts using gin(title_kn extensions.gin_trgm_ops);
create index posts_title_en_idx on public.posts using gin(title_en extensions.gin_trgm_ops);
create index posts_title_translit_idx on public.posts using gin(title_translit extensions.gin_trgm_ops);
create index posts_breaking_idx on public.posts(is_breaking) where is_breaking;
create index posts_live_idx on public.posts(is_live) where is_live;
create index post_categories_category_idx on public.post_categories(category_id,post_id);
create index posts_author_idx on public.posts(author_id);
create index posts_event_idx on public.posts(event_id);
create index categories_parent_idx on public.categories(parent_id);
create index post_tags_tag_idx on public.post_tags(tag_id);
create index key_points_post_idx on public.key_points(post_id);

COMMIT;

-- 20260916000200_features.sql
BEGIN;
create table public.ads(id uuid primary key default gen_random_uuid(),slot public.ad_slot not null,advertiser text not null,image_url text,target_url text,alt_kn text,starts_at timestamptz not null default now(),ends_at timestamptz not null,category_ids uuid[] not null default '{}',is_active boolean not null default false,impressions bigint not null default 0,clicks bigint not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>=starts_at));
create table public.submissions(id uuid primary key default gen_random_uuid(),name text not null,phone text not null,email text,town text,kind text,event_date date,link text,message text not null,status public.submission_status not null default 'new',converted_post_id uuid references public.posts(id),ip_hash text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.bookmarks(user_id uuid references public.profiles(id) on delete cascade,post_id uuid references public.posts(id) on delete cascade,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(user_id,post_id));
create table public.event_reminders(user_id uuid references public.profiles(id) on delete cascade,event_id uuid references public.events(id) on delete cascade,channel text not null check(channel in ('push','email','whatsapp')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(user_id,event_id,channel));
create table public.push_subscriptions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id) on delete cascade,endpoint text not null unique check(endpoint like 'https://%'),p256dh text not null,auth text not null,topics text[] not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.redirects(old_path text primary key,new_path text not null check(new_path like '/%' and new_path not like '//%'),status_code int not null default 301 check(status_code=301),hits int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.site_settings(key text primary key,value jsonb not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.import_jobs(id uuid primary key default gen_random_uuid(),file_name text not null,total_rows int not null default 0,processed_rows int not null default 0,created_rows int not null default 0,duplicate_rows int not null default 0,error_rows int not null default 0,status text not null default 'pending' check(status in ('pending','running','completed','failed')),created_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.import_rows(id uuid primary key default gen_random_uuid(),job_id uuid not null references public.import_jobs(id) on delete cascade,row_number int not null,raw jsonb not null,result text not null check(result in ('created','duplicate','error')),message text,post_id uuid references public.posts(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(job_id,row_number));
create table public.post_views_daily(post_id uuid references public.posts(id) on delete cascade,day date not null,views int not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),primary key(post_id,day));
create table public.audit_log(id uuid primary key default gen_random_uuid(),actor_id uuid references public.profiles(id),action text not null,table_name text not null,record_id text,diff jsonb,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.rate_limits(key text primary key,hits int not null default 0,expires_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index bookmarks_post_idx on public.bookmarks(post_id);
create index event_reminders_event_idx on public.event_reminders(event_id);
create index push_user_idx on public.push_subscriptions(user_id);
create index submissions_post_idx on public.submissions(converted_post_id);
create index import_jobs_creator_idx on public.import_jobs(created_by);
create index import_rows_post_idx on public.import_rows(post_id);
create index audit_actor_idx on public.audit_log(actor_id);

COMMIT;

-- 20260916000300_functions.sql
BEGIN;
create function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('reporter','editor','admin')); $$;
create function public.has_role(r public.user_role) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.profiles where id=(select auth.uid()) and role=r); $$;
create function public.can_edit_post(pid uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.posts p where p.id=pid and (public.has_role('admin') or public.has_role('editor') or (public.has_role('reporter') and p.author_id=(select auth.uid()) and p.status='draft'))); $$;
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.profiles(id,full_name,phone) values(new.id,left(coalesce(new.raw_user_meta_data->>'full_name',''),100),new.phone); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.protect_profile_role() returns trigger language plpgsql security definer set search_path='' as $$ begin if new.role is distinct from old.role and (select auth.role())<>'service_role' and not public.has_role('admin') then raise exception 'Only administrators can change roles'; end if;return new;end; $$;
create trigger protect_role before update on public.profiles for each row execute function public.protect_profile_role();
create function public.audit_content() returns trigger language plpgsql security definer set search_path='' as $$ begin insert into public.audit_log(actor_id,action,table_name,record_id,diff) values(auth.uid(),tg_op,tg_table_name,coalesce(to_jsonb(new)->>'id',to_jsonb(old)->>'id'),jsonb_build_object('old',to_jsonb(old),'new',to_jsonb(new)));return coalesce(new,old);end; $$;
create function public.enforce_primary_category() returns trigger language plpgsql set search_path='' as $$ declare pid uuid; begin if tg_table_name='posts' then pid=coalesce(new.id,old.id);else pid=coalesce(new.post_id,old.post_id);end if;if exists(select 1 from public.posts where id=pid and status in ('published','scheduled')) and (select count(*) from public.post_categories where post_id=pid and is_primary)<>1 then raise exception 'A publishable post needs exactly one primary category';end if;return null;end; $$;
create constraint trigger primary_post after insert or update on public.posts deferrable initially deferred for each row execute function public.enforce_primary_category();
create constraint trigger primary_relation after insert or update or delete on public.post_categories deferrable initially deferred for each row execute function public.enforce_primary_category();
create function public.publish_scheduled_posts() returns void language sql security definer set search_path='' as $$ update public.posts set status='published',published_at=now() where status='scheduled' and scheduled_for<=now() and event_date is not null; $$;
revoke all on function public.publish_scheduled_posts() from public,anon,authenticated;
grant execute on function public.publish_scheduled_posts() to service_role;
create function public.search_posts(q text default '',mode text default 'keyword',date_from date default null,date_to date default null,category_ids uuid[] default null,p_type public.post_type default null,p_limit int default 20,p_offset int default 0)
returns table(post jsonb,rank real,total_count bigint) language sql stable security invoker set search_path='' as $$
 with matched as (select p.*, (ts_rank(p.search_vector,websearch_to_tsquery('simple',q))+greatest(extensions.similarity(coalesce(p.title_en,''),q),extensions.similarity(coalesce(p.title_translit,''),q),extensions.similarity(p.title_kn,q)))::real as relevance
 from public.posts p where p.status='published' and p.published_at<=now()
 and (date_from is null or p.event_date>=date_from) and (date_to is null or p.event_date<=date_to)
 and (p_type is null or p.type=p_type)
 and (category_ids is null or exists(select 1 from public.post_categories pc where pc.post_id=p.id and pc.category_id=any(category_ids)))
 and (mode='event_date' or q='' or p.search_vector@@websearch_to_tsquery('simple',q) or p.title_kn ilike '%'||q||'%' or p.title_en ilike '%'||q||'%' or p.title_translit ilike '%'||q||'%'))
 select to_jsonb(matched)-'relevance',relevance,count(*) over() from matched order by relevance desc,published_at desc limit least(greatest(p_limit,1),100) offset greatest(p_offset,0); $$;
create function public.trending_posts(days int default 7,p_limit int default 10) returns setof public.posts language sql stable security invoker set search_path='' as $$ select p.* from public.posts p where p.status='published' and p.published_at<=now() order by p.view_count desc limit least(greatest(p_limit,1),100); $$;
create function public.consume_rate_limit(p_key text,p_max int,p_seconds int) returns boolean language plpgsql security definer set search_path='' as $$ declare n int;begin insert into public.rate_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set hits=case when public.rate_limits.expires_at<now() then 1 else public.rate_limits.hits+1 end,expires_at=case when public.rate_limits.expires_at<now() then now()+make_interval(secs=>p_seconds) else public.rate_limits.expires_at end returning hits into n;return n<=p_max;end; $$;
revoke all on function public.consume_rate_limit(text,int,int) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,int,int) to service_role;
do $$ declare t text;begin foreach t in array array['profiles','categories','events','posts','post_categories','tags','post_tags','key_points','ads','submissions','bookmarks','event_reminders','push_subscriptions','redirects','site_settings','import_jobs','import_rows','post_views_daily','audit_log','rate_limits'] loop execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);end loop;foreach t in array array['posts','categories','events','ads','site_settings','redirects'] loop execute format('create trigger audit_change after insert or update or delete on public.%I for each row execute function public.audit_content()',t);end loop;end; $$;

COMMIT;

-- 20260916000400_rls.sql
BEGIN;
-- Every application table is protected. All elevated functions have fixed search_path.
do $$ declare t text;begin foreach t in array array['profiles','categories','events','posts','post_categories','tags','post_tags','key_points','ads','submissions','bookmarks','event_reminders','push_subscriptions','redirects','site_settings','import_jobs','import_rows','post_views_daily','audit_log','rate_limits'] loop execute format('alter table public.%I enable row level security',t);end loop;end; $$;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid()) or public.has_role('admin')) with check(id=(select auth.uid()) or public.has_role('admin'));
create policy posts_read on public.posts for select using((status='published' and published_at<=now()) or public.is_staff());
create policy posts_insert on public.posts for insert to authenticated with check(public.has_role('admin') or public.has_role('editor') or(public.has_role('reporter') and author_id=(select auth.uid()) and status='draft'));
create policy posts_update on public.posts for update to authenticated using(public.can_edit_post(id)) with check(public.has_role('admin') or public.has_role('editor') or(public.has_role('reporter') and author_id=(select auth.uid()) and status='draft'));
create policy posts_delete on public.posts for delete to authenticated using(public.has_role('admin'));
do $$ declare t text;begin foreach t in array array['categories','events','tags'] loop
 execute format('create policy content_read on public.%I for select using(true)',t);
 execute format('create policy content_insert on public.%I for insert to authenticated with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 execute format('create policy content_update on public.%I for update to authenticated using(public.has_role(''editor'') or public.has_role(''admin'')) with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 execute format('create policy content_delete on public.%I for delete to authenticated using(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['post_categories','post_tags','key_points'] loop
 execute format('create policy related_read on public.%I for select using(exists(select 1 from public.posts p where p.id=post_id))',t);
 execute format('create policy related_insert on public.%I for insert to authenticated with check(public.can_edit_post(post_id))',t);
 execute format('create policy related_update on public.%I for update to authenticated using(public.can_edit_post(post_id)) with check(public.can_edit_post(post_id))',t);
 execute format('create policy related_delete on public.%I for delete to authenticated using(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['bookmarks','event_reminders','push_subscriptions'] loop
 execute format('create policy own_rows on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['redirects','site_settings'] loop
 execute format('create policy public_read on public.%I for select using(true)',t);
 execute format('create policy admin_write on public.%I for all to authenticated using(public.has_role(''admin'')) with check(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['import_jobs','import_rows'] loop
 execute format('create policy staff_read on public.%I for select to authenticated using(public.is_staff())',t);
 execute format('create policy editor_write on public.%I for all to authenticated using(public.has_role(''editor'') or public.has_role(''admin'')) with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 end loop;
 end; $$;
create policy ads_read on public.ads for select using((is_active and starts_at<=now() and ends_at>now()) or public.is_staff());
create policy ads_manage on public.ads for all to authenticated using(public.has_role('editor') or public.has_role('admin')) with check(public.has_role('editor') or public.has_role('admin'));
create policy submissions_read on public.submissions for select to authenticated using(public.is_staff());
create policy submissions_update on public.submissions for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy views_read on public.post_views_daily for select to authenticated using(public.is_staff());
create policy audit_read on public.audit_log for select to authenticated using(public.is_staff());
-- No client write policies for audit_log, rate_limits, post_views_daily, or submissions INSERT.
grant select on public.categories,public.events,public.tags,public.posts,public.post_categories,public.post_tags,public.key_points,public.ads,public.redirects,public.site_settings to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;

COMMIT;

-- 20260916000500_storage.sql
BEGIN;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('site-assets','site-assets',true,1048576,array['image/jpeg','image/png','image/webp','image/avif']);
create policy site_assets_read on storage.objects for select using(bucket_id='site-assets');
create policy site_assets_insert on storage.objects for insert to authenticated with check(bucket_id='site-assets' and public.is_staff());
create policy site_assets_update on storage.objects for update to authenticated using(bucket_id='site-assets' and public.is_staff()) with check(bucket_id='site-assets' and public.is_staff());
create policy site_assets_delete on storage.objects for delete to authenticated using(bucket_id='site-assets' and public.has_role('admin'));

COMMIT;

-- 20260916000600_editor_transaction.sql
BEGIN;
-- Atomic save of post and its category assignments, including publication.
create function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; uid uuid:=auth.uid(); target_status public.post_status; category uuid;
begin
 if not public.is_staff() then raise exception 'Staff only';end if;
 target_status:=(payload->>'status')::public.post_status;
 if public.has_role('reporter') and target_status<>'draft' then raise exception 'Reporters may only save drafts';end if;
 if payload->>'id' is not null then
  pid:=(payload->>'id')::uuid;
  if not public.can_edit_post(pid) then raise exception 'Not permitted';end if;
 else pid:=gen_random_uuid();end if;
 if not exists(select 1 from jsonb_array_elements_text(payload->'category_ids') x where x.value=payload->>'primary_category') then raise exception 'Primary category must be selected';end if;
 insert into public.posts(id,title_kn,title_en,title_translit,slug,summary_kn,body_html,body_json,event_date,event_place,status,scheduled_for,published_at,author_id,type,video_provider,video_id,video_url,thumbnail_url)
 values(pid,payload->>'title_kn',payload->>'title_en',payload->>'title_translit',payload->>'slug',payload->>'summary_kn',payload->>'body_html',payload->'body_json',(payload->>'event_date')::date,payload->>'event_place',target_status,nullif(payload->>'scheduled_for','')::timestamptz,case when target_status='published' then now() end,uid,(payload->>'type')::public.post_type,(payload->>'video_provider')::public.video_provider,payload->>'video_id',payload->>'video_url',payload->>'thumbnail_url')
 on conflict(id) do update set title_kn=excluded.title_kn,title_en=excluded.title_en,title_translit=excluded.title_translit,slug=excluded.slug,summary_kn=excluded.summary_kn,body_html=excluded.body_html,body_json=excluded.body_json,event_date=excluded.event_date,event_place=excluded.event_place,status=excluded.status,scheduled_for=excluded.scheduled_for,published_at=coalesce(public.posts.published_at,excluded.published_at),type=excluded.type,video_provider=excluded.video_provider,video_id=excluded.video_id,video_url=excluded.video_url,thumbnail_url=excluded.thumbnail_url;
 delete from public.post_categories where post_id=pid;
 for category in select value::uuid from jsonb_array_elements_text(payload->'category_ids') loop
 insert into public.post_categories(post_id,category_id,is_primary) values(pid,category,category=(payload->>'primary_category')::uuid);end loop;
 return pid;
end; $$;
revoke all on function public.save_editor_post(jsonb) from public,anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;

COMMIT;

-- 20260916000700_v4_roles.sql
BEGIN;
-- Add roles before the following migration uses their permissions.
alter type public.user_role add value if not exists 'editor_in_chief';
alter type public.user_role add value if not exists 'sub_editor';
alter type public.user_role add value if not exists 'contributor';
alter type public.user_role add value if not exists 'moderator';
alter type public.user_role add value if not exists 'analyst';
alter type public.user_role add value if not exists 'ad_manager';

COMMIT;

-- 20260916000800_v4_foundation.sql
BEGIN;
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

COMMIT;

-- 20260916000900_v4_editorial_rpcs.sql
BEGIN;
-- v4 transactional editorial operations. Review before LOCAL application.
create function public.replace_v4_relationships(kind text,parent_id uuid,post_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare position integer:=1; pid uuid;
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted'; end if;
 if coalesce(array_length(post_ids,1),0)>200 or cardinality(post_ids)<>(select count(distinct value) from unnest(post_ids) value) then raise exception 'Invalid list'; end if;
 if kind='topics' then
  perform 1 from public.topics where id=parent_id for update;if not found then raise exception 'Not found';end if;
  delete from public.topic_pins where topic_id=parent_id;
  foreach pid in array post_ids loop insert into public.topic_pins(topic_id,post_id,sort_order) values(parent_id,pid,position);position:=position+1;end loop;
 elsif kind='series' then
  perform 1 from public.series where id=parent_id for update;if not found then raise exception 'Not found';end if;
  delete from public.series_items where series_id=parent_id;
  foreach pid in array post_ids loop insert into public.series_items(series_id,post_id,episode_no) values(parent_id,pid,position);position:=position+1;end loop;
 else raise exception 'Invalid collection';
 end if;
end; $$;
revoke all on function public.replace_v4_relationships(text,uuid,uuid[]) from public,anon;
grant execute on function public.replace_v4_relationships(text,uuid,uuid[]) to authenticated;

create function public.merge_v4_tags(source_id uuid,destination_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 if source_id=destination_id then raise exception 'Invalid merge';end if;
 perform 1 from public.tags where id in (source_id,destination_id) order by id for update;
 if not exists(select 1 from public.tags where id=source_id and merged_into_id is null) or not exists(select 1 from public.tags where id=destination_id and merged_into_id is null) then raise exception 'Invalid tags';end if;
 insert into public.post_tags(post_id,tag_id) select post_id,destination_id from public.post_tags where tag_id=source_id on conflict do nothing;
 delete from public.post_tags where tag_id=source_id;
 update public.tags set merged_into_id=destination_id where id=source_id or merged_into_id=source_id;
 update public.topics set tag_ids=array(select distinct value from unnest(array_replace(tag_ids,source_id,destination_id)) value) where source_id=any(tag_ids);
 insert into public.follows(user_id,target_type,target_id,label_kn) select user_id,'tag',destination_id,(select name_kn from public.tags where id=destination_id) from public.follows where target_type='tag' and target_id=source_id on conflict do nothing;
 delete from public.follows where target_type='tag' and target_id=source_id;
end; $$;
revoke all on function public.merge_v4_tags(uuid,uuid) from public,anon;
grant execute on function public.merge_v4_tags(uuid,uuid) to authenticated;

create function public.moderate_v4_submission(submission_id uuid,decision text) returns uuid language plpgsql security definer set search_path='' as $$
declare submission public.community_submissions; result_id uuid; p jsonb;
begin
 if not public.has_permission('community.manage') then raise exception 'Not permitted';end if;
 if decision not in ('approved','rejected') then raise exception 'Invalid decision';end if;
 select * into submission from public.community_submissions where id=submission_id for update;
 if not found then raise exception 'Not found';end if;
 if submission.status<>'pending' then return submission.published_id;end if;
 p:=submission.payload;
 if decision='approved' then
  if submission.kind='notice' then
   insert into public.notices(slug,type,title_kn,body_kn,place_id,event_date,status,published_at)
   values('notice-'||submission.id,p->>'type',p->>'title_kn',p->>'body_kn',nullif(p->>'place_id','')::uuid,(p->>'date')::date,'approved',now()) returning id into result_id;
  elsif submission.kind='opportunity' then
   insert into public.opportunities(slug,title_kn,org,kind,place_id,last_date,link,description_kn,status)
   values('opportunity-'||submission.id,p->>'title_kn',coalesce(p->>'org',''),p->>'type',nullif(p->>'place_id','')::uuid,(p->>'date')::date,nullif(p->>'link',''),p->>'body_kn','approved') returning id into result_id;
  elsif submission.kind='condolence' then
   if not exists(select 1 from public.notices where id=(p->>'target_id')::uuid and status='approved') then raise exception 'Notice not published';end if;
   insert into public.notice_messages(notice_id,name,message,status) values((p->>'target_id')::uuid,p->>'name',p->>'body_kn','approved') returning id into result_id;
  end if;
 end if;
 update public.community_submissions set status=decision,reviewed_by=(select auth.uid()),published_id=result_id where id=submission_id;
 return result_id;
end; $$;
revoke all on function public.moderate_v4_submission(uuid,text) from public,anon;
grant execute on function public.moderate_v4_submission(uuid,text) to authenticated;

create function public.record_v4_vote(poll uuid,choice integer,device text,actor uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare current_poll public.polls;
begin
 select * into current_poll from public.polls where id=poll for update;
 if not found or current_poll.status<>'active' or current_poll.ends_at<=now() then raise exception 'Poll closed';end if;
 if choice<0 or choice>=jsonb_array_length(current_poll.options) then raise exception 'Invalid choice';end if;
 insert into public.poll_votes(poll_id,option_index,user_id,device_hash) values(poll,choice,actor,device);
end; $$;
revoke all on function public.record_v4_vote(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.record_v4_vote(uuid,integer,text,uuid) to service_role;

create function public.v4_poll_results(poll uuid) returns table(option_index integer,votes bigint) language sql stable security definer set search_path='' as $$
 select v.option_index,count(*) from public.poll_votes v join public.polls p on p.id=v.poll_id where p.id=poll and p.status in ('active','closed') group by v.option_index order by v.option_index;
$$;
grant execute on function public.v4_poll_results(uuid) to anon,authenticated;

create function public.cap_reading_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.reading_history where user_id=new.user_id and post_id in (select post_id from public.reading_history where user_id=new.user_id order by last_viewed_at desc offset 200);
 return new;
end; $$;
create trigger cap_history after insert or update on public.reading_history for each row execute function public.cap_reading_history();

-- Realtime sends only published live-blog updates through RLS.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='liveblog_updates') then alter publication supabase_realtime add table public.liveblog_updates;end if;
end; $$;

COMMIT;

-- 20260916001000_v4_workflow_security.sql
BEGIN;
-- Dynamic permissions govern both direct REST access and editor RPCs.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select public.has_permission('admin.access'); $$;
create or replace function public.can_edit_post(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.posts p where p.id=pid and (public.has_permission('content.edit') or (public.has_permission('content.create') and p.author_id=auth.uid() and p.status='draft')));
$$;
drop policy posts_read on public.posts;
create policy posts_read on public.posts for select using((status='published' and published_at<=now() and (embargo_until is null or embargo_until<=now())) or public.has_permission('content.read') or (author_id=auth.uid() and public.has_permission('content.create')));
drop policy posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check((public.has_permission('content.edit') or (public.has_permission('content.create') and author_id=auth.uid() and status='draft')) and (status not in ('published','scheduled') or public.has_permission('content.publish')));
drop policy posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated using(public.can_edit_post(id)) with check((public.has_permission('content.edit') or (public.has_permission('content.create') and author_id=auth.uid() and status='draft')) and (status not in ('published','scheduled') or public.has_permission('content.publish')));
do $$ declare tab text;begin
 foreach tab in array array['categories','events','tags'] loop
 execute format('drop policy content_insert on public.%I',tab);
 execute format('drop policy content_update on public.%I',tab);
 execute format('drop policy content_delete on public.%I',tab);
 execute format('create policy editorial_write on public.%I for all to authenticated using(public.has_permission(''content.edit'')) with check(public.has_permission(''content.edit''))',tab);
 end loop;
 foreach tab in array array['import_jobs','import_rows'] loop
 execute format('drop policy editor_write on public.%I',tab);
 execute format('create policy editorial_write on public.%I for all to authenticated using(public.has_permission(''content.edit'')) with check(public.has_permission(''content.edit''))',tab);
 end loop;
end; $$;
drop policy ads_manage on public.ads;
create policy ads_manage on public.ads for all to authenticated using(public.has_permission('ads.manage')) with check(public.has_permission('ads.manage'));
drop policy submissions_read on public.submissions;
drop policy submissions_update on public.submissions;
create policy submissions_read on public.submissions for select to authenticated using(public.has_permission('community.manage'));
create policy submissions_update on public.submissions for update to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
drop policy views_read on public.post_views_daily;
create policy views_read on public.post_views_daily for select to authenticated using(public.has_permission('analytics.read'));

-- Publication guard also runs for direct writes; administrative role alone cannot bypass an embargo.
create function public.v4_post_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.locked_by is not null and old.locked_by<>auth.uid() and old.locked_at>now()-interval '15 minutes' and auth.role()<>'service_role' then raise exception 'Post is locked by another editor';end if;
 if new.status in ('published','scheduled') then
  if auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
  if new.embargo_until is not null and ((new.status='published' and new.embargo_until>now()) or (new.status='scheduled' and new.scheduled_for<new.embargo_until)) then raise exception 'Embargo has not ended';end if;
  if nullif(trim(new.summary_kn),'') is null or new.event_date is null or nullif(trim(new.image_credit),'') is null or char_length(new.title_kn)>110 then raise exception 'Publication checklist incomplete';end if;
 end if;
 if tg_op='UPDATE' and (new.body_html is distinct from old.body_html or new.title_kn is distinct from old.title_kn) then
  insert into public.post_versions(post_id,author_id,snapshot) values(old.id,auth.uid(),to_jsonb(old)-'search_vector');
  if new.meaningful_update_at is not distinct from old.meaningful_update_at then new.meaningful_update_at:=old.meaningful_update_at;end if;
 end if;
 return new;
end; $$;
create trigger v4_guard before insert or update on public.posts for each row execute function public.v4_post_guard();
drop policy staff_manage on public.post_versions;
create policy version_read on public.post_versions for select to authenticated using(public.can_edit_post(post_id));
revoke insert,update,delete on public.post_versions from authenticated;

create function public.lock_v4_post(target uuid,release boolean default false,takeover boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare current_post public.posts;
begin
 if not public.can_edit_post(target) then raise exception 'Not permitted';end if;
 select * into current_post from public.posts where id=target for update;
 if release then
  if current_post.locked_by=auth.uid() then update public.posts set locked_by=null,locked_at=null where id=target;return true;end if;return false;
 end if;
 if current_post.locked_by is not null and current_post.locked_by<>auth.uid() and current_post.locked_at>now()-interval '15 minutes' then
  -- Takeover is explicit and limited to administrators; unlock first so the guard can apply.
  if not takeover or not public.has_role('admin') then return false;end if;
  return false;
 end if;
 update public.posts set locked_by=auth.uid(),locked_at=now() where id=target;
 return true;
end; $$;
revoke all on function public.lock_v4_post(uuid,boolean,boolean) from public,anon;
grant execute on function public.lock_v4_post(uuid,boolean,boolean) to authenticated;
create or replace function public.publish_scheduled_posts() returns void language sql security definer set search_path='' as $$
 update public.posts set status='published',published_at=now() where status='scheduled' and scheduled_for<=now() and (embargo_until is null or embargo_until<=now()) and event_date is not null and nullif(trim(summary_kn),'') is not null and nullif(trim(image_credit),'') is not null and char_length(title_kn)<=110;
$$;
create unique index reaction_one_per_user on public.reactions(post_id,user_id) where user_id is not null;

COMMIT;

-- 20260916001100_v4_post_save.sql
BEGIN;
-- Atomic save of post and its category assignments, including publication.
create or replace function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; uid uuid:=auth.uid(); target_status public.post_status; category uuid;
begin
 if not (public.has_permission('content.edit') or public.has_permission('content.create')) then raise exception 'Staff only';end if;
 target_status:=(payload->>'status')::public.post_status;
 if not public.has_permission('content.edit') and target_status<>'draft' then raise exception 'Reporters may only save drafts';end if;
 if payload->>'id' is not null then
  pid:=(payload->>'id')::uuid;
  if not public.can_edit_post(pid) then raise exception 'Not permitted';end if;
 else pid:=gen_random_uuid();end if;
 if not exists(select 1 from jsonb_array_elements_text(payload->'category_ids') x where x.value=payload->>'primary_category') then raise exception 'Primary category must be selected';end if;
 insert into public.posts(id,title_kn,title_en,title_translit,slug,summary_kn,body_html,body_json,event_date,event_place,status,scheduled_for,published_at,author_id,type,video_provider,video_id,video_url,thumbnail_url,image_credit,embargo_until,summary_points,hide_ads,meaningful_update_at)
 values(pid,payload->>'title_kn',payload->>'title_en',payload->>'title_translit',payload->>'slug',payload->>'summary_kn',payload->>'body_html',payload->'body_json',(payload->>'event_date')::date,payload->>'event_place',target_status,nullif(payload->>'scheduled_for','')::timestamptz,case when target_status='published' then now() end,uid,(payload->>'type')::public.post_type,(payload->>'video_provider')::public.video_provider,payload->>'video_id',payload->>'video_url',payload->>'thumbnail_url',payload->>'image_credit',nullif(payload->>'embargo_until','')::timestamptz,coalesce(payload->'summary_points','[]'::jsonb),coalesce((payload->>'hide_ads')::boolean,false),case when (payload->>'meaningful_edit')::boolean then now() end)
 on conflict(id) do update set title_kn=excluded.title_kn,title_en=excluded.title_en,title_translit=excluded.title_translit,slug=excluded.slug,summary_kn=excluded.summary_kn,body_html=excluded.body_html,body_json=excluded.body_json,event_date=excluded.event_date,event_place=excluded.event_place,status=excluded.status,scheduled_for=excluded.scheduled_for,published_at=coalesce(public.posts.published_at,excluded.published_at),type=excluded.type,video_provider=excluded.video_provider,video_id=excluded.video_id,video_url=excluded.video_url,thumbnail_url=excluded.thumbnail_url,image_credit=excluded.image_credit,embargo_until=excluded.embargo_until,summary_points=excluded.summary_points,hide_ads=excluded.hide_ads,meaningful_update_at=coalesce(excluded.meaningful_update_at,public.posts.meaningful_update_at);
 delete from public.post_categories where post_id=pid;
 for category in select value::uuid from jsonb_array_elements_text(payload->'category_ids') loop
 insert into public.post_categories(post_id,category_id,is_primary) values(pid,category,category=(payload->>'primary_category')::uuid);end loop;
 return pid;
end; $$;
revoke all on function public.save_editor_post(jsonb) from public,anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;

COMMIT;

-- 20260916001200_v4_provider_jobs.sql
BEGIN;
create table public.ai_suggestion_acceptances(
 suggestion_id uuid not null references public.ai_suggestions(id) on delete cascade,item_index int not null check(item_index between 0 and 19),user_id uuid not null references public.profiles(id),created_at timestamptz not null default now(),primary key(suggestion_id,item_index)
);
alter table public.ai_suggestion_acceptances enable row level security;
create policy own_read on public.ai_suggestion_acceptances for select to authenticated using(user_id=auth.uid());
grant select on public.ai_suggestion_acceptances to authenticated;
grant all on public.ai_suggestion_acceptances to service_role;
create function public.save_weather_snapshot(weather jsonb,air jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if weather->>'place_id' is distinct from air->>'place_id' then raise exception 'Place mismatch';end if;
 insert into public.weather_snapshots(place_id,fetched_at,current,hourly,daily,provider) values((weather->>'place_id')::uuid,(weather->>'fetched_at')::timestamptz,weather->'current',weather->'hourly',weather->'daily',weather->>'provider')
 on conflict(place_id) do update set fetched_at=excluded.fetched_at,current=excluded.current,hourly=excluded.hourly,daily=excluded.daily,provider=excluded.provider;
 insert into public.aqi_snapshots(place_id,fetched_at,pollutants,naqi,provider) values((air->>'place_id')::uuid,(air->>'fetched_at')::timestamptz,air->'pollutants',(air->>'naqi')::integer,air->>'provider')
 on conflict(place_id) do update set fetched_at=excluded.fetched_at,pollutants=excluded.pollutants,naqi=excluded.naqi,provider=excluded.provider;
end; $$;
revoke all on function public.save_weather_snapshot(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_weather_snapshot(jsonb,jsonb) to service_role;
create function public.claim_v4_jobs(batch_size integer default 5) returns setof public.automation_jobs language sql security definer set search_path='' as $$
 update public.automation_jobs set status='running',locked_at=now(),attempts=attempts+1 where id in (
 select id from public.automation_jobs where status='pending' and run_after<=now() and attempts<3 order by run_after for update skip locked limit least(greatest(batch_size,1),10)
 ) returning *;
$$;
revoke all on function public.claim_v4_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_v4_jobs(integer) to service_role;

COMMIT;

-- 20260916001300_v4_editorial_review.sql
BEGIN;
alter table public.story_assignments drop constraint story_assignments_status_check;
alter table public.story_assignments add constraint story_assignments_status_check check(status in ('idea','assigned','draft','review','changes_requested','approved','scheduled','published','updated','archived'));
create function public.restore_v4_version(version_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare ver public.post_versions;
begin
 select * into ver from public.post_versions where id=version_id;
 if not found or not public.can_edit_post(ver.post_id) then raise exception 'Not permitted';end if;
 -- Restoring never silently republishes, changes URLs or bypasses the post lock.
 update public.posts set title_kn=ver.snapshot->>'title_kn',title_en=ver.snapshot->>'title_en',body_html=ver.snapshot->>'body_html',body_json=ver.snapshot->'body_json',summary_kn=ver.snapshot->>'summary_kn',summary_points=coalesce(ver.snapshot->'summary_points','[]'),image_credit=ver.snapshot->>'image_credit',status='draft',scheduled_for=null where id=ver.post_id;
end; $$;
revoke all on function public.restore_v4_version(uuid) from public,anon;
grant execute on function public.restore_v4_version(uuid) to authenticated;
create function public.v4_assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('approved','scheduled','published','updated') and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
 return new;
end; $$;
create trigger assignment_guard before insert or update on public.story_assignments for each row execute function public.v4_assignment_guard();

COMMIT;

-- 20260916001400_v4_ads.sql
BEGIN;
alter table public.categories add column hide_ads boolean not null default false;
create table public.ad_campaigns(id uuid primary key default gen_random_uuid(),slug text not null unique,advertiser text not null,is_active boolean not null default false,starts_at timestamptz not null,ends_at timestamptz not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),check(ends_at>starts_at));
create table public.ad_slots(slot_key text primary key,mode text not null default 'manual_then_google' check(mode in ('manual','google','manual_then_google','off')),adsense_slot_id text not null default '',adsense_format text not null default 'auto' check(adsense_format in ('auto','fluid','in-article')),enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.ads add column campaign_id uuid references public.ad_campaigns(id);
alter table public.ads add column mobile_image_url text;
alter table public.ads add column slot_keys text[] not null default '{}';
alter table public.ads add column target_places uuid[] not null default '{}';
alter table public.ads add column target_pages text[] not null default '{}';
alter table public.ads add column device text not null default 'all' check(device in ('all','mobile','desktop'));
alter table public.ads add column priority integer not null default 0;
alter table public.ads add column weight integer not null default 1 check(weight between 1 and 1000);
alter table public.ads add column max_impressions bigint check(max_impressions>=0);
alter table public.ads add column max_clicks bigint check(max_clicks>=0);
alter table public.ads add column daily_impression_cap integer check(daily_impression_cap>=0);
create table public.ad_stats_daily(ad_id uuid not null references public.ads(id) on delete cascade,slot_key text not null,day date not null,device text not null,impressions bigint not null default 0,clicks bigint not null default 0,primary key(ad_id,slot_key,day,device));
do $$ declare tab text;begin foreach tab in array array['ad_campaigns','ad_slots','ad_stats_daily'] loop
 execute format('alter table public.%I enable row level security',tab);
 execute format('create policy ads_read on public.%I for select to authenticated using(public.has_permission(''ads.manage'') or public.has_permission(''analytics.read''))',tab);
 if tab<>'ad_stats_daily' then execute format('create policy ads_write on public.%I for all to authenticated using(public.has_permission(''ads.manage'')) with check(public.has_permission(''ads.manage''))',tab);execute format('create trigger audit_changes after insert or update or delete on public.%I for each row execute function public.audit_content()',tab);end if;
 end loop;end; $$;
grant select,insert,update,delete on public.ad_campaigns,public.ad_slots to authenticated;
grant select on public.ad_stats_daily to authenticated;
grant all on public.ad_campaigns,public.ad_slots,public.ad_stats_daily to service_role;
insert into public.ad_slots(slot_key) select unnest(array['home_top_leaderboard','home_hero_sidebar','home_after_hero','home_between_sections','home_sidebar_sticky','home_footer_banner','category_top','category_in_grid','category_sidebar','article_top','article_in_content_1','article_in_content_2','article_end','article_sidebar_top','article_sidebar_sticky','video_below_player','video_sidebar','search_inline','events_sidebar','global_mobile_sticky']);
update public.ads set slot_keys=array[case slot when 'home_banner' then 'home_top_leaderboard' when 'sidebar' then 'category_sidebar' when 'in_article' then 'article_in_content_1' when 'category_top' then 'category_top' else 'events_sidebar' end];
create function public.pick_manual_ad(requested_slot text,page_type text,category_ids uuid[],place_id uuid,device_type text) returns setof public.ads language sql volatile security definer set search_path='' as $$
 select a.* from public.ads a left join public.ad_campaigns c on c.id=a.campaign_id
 where a.is_active and a.starts_at<=now() and a.ends_at>now()
 and (a.campaign_id is null or (c.is_active and c.starts_at<=now() and c.ends_at>now()))
 and requested_slot=any(a.slot_keys) and (a.device='all' or a.device=device_type)
 and (cardinality(a.category_ids)=0 or a.category_ids&&pick_manual_ad.category_ids)
 and (cardinality(a.target_places)=0 or place_id=any(a.target_places))
 and (cardinality(a.target_pages)=0 or page_type=any(a.target_pages))
 and (a.max_impressions is null or a.impressions<a.max_impressions)
 and (a.max_clicks is null or a.clicks<a.max_clicks)
 and (a.daily_impression_cap is null or (select coalesce(sum(s.impressions),0) from public.ad_stats_daily s where s.ad_id=a.id and s.day=(now() at time zone 'Asia/Kolkata')::date)<a.daily_impression_cap)
 order by a.priority desc,-ln(greatest(random(),0.000001))/a.weight limit 1;
$$;
revoke all on function public.pick_manual_ad(text,text,uuid[],uuid,text) from public,anon,authenticated;
grant execute on function public.pick_manual_ad(text,text,uuid[],uuid,text) to service_role;
create function public.record_ad_event(ad uuid,slot text,device text,session text,kind text) returns void language plpgsql security definer set search_path='' as $$
declare row public.ads;today date:=(now() at time zone 'Asia/Kolkata')::date;daily_count bigint;
begin
 if kind not in ('click','impression') or device not in ('mobile','desktop') then return;end if;
 if not public.v4_rate_limit('ad:'||ad::text||':'||session||':'||kind,1,case when kind='click' then 30 else 60 end) then return;end if;
 select * into row from public.ads where id=ad for update;
 if not found or not row.is_active or row.starts_at>now() or row.ends_at<=now() or not slot=any(row.slot_keys) then return;end if;
 if kind='impression' then
  select coalesce(sum(impressions),0) into daily_count from public.ad_stats_daily where ad_id=ad and day=today;
  if (row.max_impressions is not null and row.impressions>=row.max_impressions) or (row.daily_impression_cap is not null and daily_count>=row.daily_impression_cap) then return;end if;
  update public.ads set impressions=impressions+1 where id=ad;
 else update public.ads set clicks=clicks+1 where id=ad;end if;
 insert into public.ad_stats_daily(ad_id,slot_key,day,device,impressions,clicks) values(ad,slot,today,device,case when kind='impression' then 1 else 0 end,case when kind='click' then 1 else 0 end)
 on conflict on constraint ad_stats_daily_pkey do update set impressions=public.ad_stats_daily.impressions+excluded.impressions,clicks=public.ad_stats_daily.clicks+excluded.clicks;
end; $$;
revoke all on function public.record_ad_event(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.record_ad_event(uuid,text,text,text,text) to service_role;

COMMIT;

-- 20260916001500_v4_analytics.sql
BEGIN;
alter table public.post_engagement_daily add column views bigint not null default 0;
alter table public.post_engagement_daily add column video_plays bigint not null default 0;
alter table public.post_engagement_daily add column push_clicks bigint not null default 0;
create table public.traffic_daily(post_id uuid not null references public.posts(id) on delete cascade,day date not null,source text not null,device text not null,views bigint not null default 0,primary key(post_id,day,source,device));
alter table public.traffic_daily enable row level security;
create policy analytics_read on public.traffic_daily for select to authenticated using(public.has_permission('analytics.read'));
grant select on public.traffic_daily to authenticated;
grant all on public.traffic_daily to service_role;
create function public.record_v4_pulse(payload jsonb) returns void language plpgsql security definer set search_path='' as $$
declare pid uuid:=(payload->>'post_id')::uuid;sid text:=payload->>'session_hash';kind text:=payload->>'event';seconds integer:=least(greatest((payload->>'seconds')::integer,0),15);depth integer:=(payload->>'depth')::integer;today date:=(now() at time zone 'Asia/Kolkata')::date;new_view boolean:=false;
begin
 if not exists(select 1 from public.posts where id=pid and status='published' and published_at<=now() and not is_seed) or length(sid)<>64 then return;end if;
 if kind not in ('view','engaged','share','listen','video','push') then return;end if;
 insert into public.page_pulse(session_hash,post_id,last_seen_at) values(sid,pid,now()) on conflict(session_hash,post_id) do update set last_seen_at=now();
 if kind='view' then
  new_view:=public.v4_rate_limit('pulse-view:'||sid||pid::text,1,86400);
  if not new_view then return;end if;
 elsif kind='engaged' then
  if not public.v4_rate_limit('pulse-tick:'||sid||pid::text,1,14) then return;end if;
  if not public.v4_rate_limit('pulse-cap:'||sid||pid::text,120,86400) then return;end if;
 elsif not public.v4_rate_limit('pulse-event:'||sid||pid::text||kind,1,60) then return;
 end if;
 insert into public.post_engagement_daily(post_id,day,views,engaged_seconds,share_clicks,listen_plays,video_plays,push_clicks)
 values(pid,today,case when new_view then 1 else 0 end,case when kind='engaged' then seconds else 0 end,case when kind='share' then 1 else 0 end,case when kind='listen' then 1 else 0 end,case when kind='video' then 1 else 0 end,case when kind='push' then 1 else 0 end)
 on conflict(post_id,day) do update set views=public.post_engagement_daily.views+excluded.views,engaged_seconds=public.post_engagement_daily.engaged_seconds+excluded.engaged_seconds,share_clicks=public.post_engagement_daily.share_clicks+excluded.share_clicks,listen_plays=public.post_engagement_daily.listen_plays+excluded.listen_plays,video_plays=public.post_engagement_daily.video_plays+excluded.video_plays,push_clicks=public.post_engagement_daily.push_clicks+excluded.push_clicks;
 if depth>=25 and public.v4_rate_limit('pulse-depth25:'||sid||pid::text,1,86400) then update public.post_engagement_daily set scroll_25=scroll_25+1 where post_id=pid and day=today;end if;
 if depth>=50 and public.v4_rate_limit('pulse-depth50:'||sid||pid::text,1,86400) then update public.post_engagement_daily set scroll_50=scroll_50+1 where post_id=pid and day=today;end if;
 if depth>=75 and public.v4_rate_limit('pulse-depth75:'||sid||pid::text,1,86400) then update public.post_engagement_daily set scroll_75=scroll_75+1 where post_id=pid and day=today;end if;
 if depth>=100 and public.v4_rate_limit('pulse-depth100:'||sid||pid::text,1,86400) then update public.post_engagement_daily set scroll_100=scroll_100+1 where post_id=pid and day=today;end if;
 if new_view then
  insert into public.traffic_daily(post_id,day,source,device,views) values(pid,today,payload->>'source',payload->>'device',1) on conflict(post_id,day,source,device) do update set views=public.traffic_daily.views+1;
  insert into public.post_views_daily(post_id,day,views) values(pid,today,1) on conflict(post_id,day) do update set views=public.post_views_daily.views+1;
 end if;
end; $$;
revoke all on function public.record_v4_pulse(jsonb) from public,anon,authenticated;
grant execute on function public.record_v4_pulse(jsonb) to service_role;
create function public.cleanup_v4_ephemeral() returns void language plpgsql security definer set search_path='' as $$
begin
 delete from public.page_pulse where last_seen_at<now()-interval '10 minutes';
 delete from public.v4_rate_limits where window_start<now()-interval '2 days';
 update public.automation_jobs set status='failed',last_error='Worker lease expired; review external delivery before retry' where status='running' and locked_at<now()-interval '20 minutes';
 delete from public.newsletter_subscribers where status='pending' and token_expires_at<now()-interval '30 days';
end; $$;
revoke all on function public.cleanup_v4_ephemeral() from public,anon,authenticated;
grant execute on function public.cleanup_v4_ephemeral() to service_role;

COMMIT;

-- 20260916001600_v4_audio_jobs.sql
BEGIN;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('article-audio','article-audio',true,20971520,array['audio/mpeg']) on conflict(id) do nothing;
create policy article_audio_public on storage.objects for select using(bucket_id='article-audio');
create unique index unique_pending_audio_job on public.automation_jobs((payload->>'post_id')) where kind='article-audio' and status in ('pending','running');
create function public.queue_v4_article_audio() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and new.audio_enabled and (tg_op='INSERT' or old.status is distinct from new.status or old.body_html is distinct from new.body_html or old.title_kn is distinct from new.title_kn) then
  if exists(select 1 from public.provider_settings where id='tts' and enabled) then
   insert into public.automation_jobs(kind,payload) values('article-audio',jsonb_build_object('post_id',new.id)) on conflict do nothing;
  end if;
 end if;
 return new;
end; $$;
create trigger queue_article_audio after insert or update on public.posts for each row execute function public.queue_v4_article_audio();

COMMIT;

-- 20260916001700_v4_distribution.sql
BEGIN;
create unique index social_one_account_per_network on public.social_accounts(network);
create table public.newsletter_deliveries(id uuid primary key default gen_random_uuid(),issue_id uuid not null references public.newsletter_issues(id),subscriber_id uuid not null references public.newsletter_subscribers(id),status text not null default 'pending' check(status in ('pending','sent','skipped','failed')),provider_id text,sent_at timestamptz,created_at timestamptz not null default now(),unique(issue_id,subscriber_id));
alter table public.newsletter_deliveries enable row level security;
create policy newsletter_read on public.newsletter_deliveries for select to authenticated using(public.has_permission('newsletter.manage'));
grant select on public.newsletter_deliveries to authenticated;
grant all on public.newsletter_deliveries to service_role;
create function public.queue_v4_distribution(kind text,item_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare state text;
begin
 if kind='newsletter' then
  select status into state from public.newsletter_issues where id=item_id for update;
  if state is distinct from 'draft' then raise exception 'Draft required';end if;
  with deliveries as (insert into public.newsletter_deliveries(issue_id,subscriber_id) select item_id,id from public.newsletter_subscribers where status='active' on conflict do nothing returning id)
  insert into public.automation_jobs(kind,payload) select 'newsletter-delivery',jsonb_build_object('delivery_id',id) from deliveries;
  update public.newsletter_issues set status='queued' where id=item_id;
 elsif kind='social' then
  select status into state from public.social_posts where id=item_id for update;
  if state is distinct from 'draft' then raise exception 'Draft required';end if;
  update public.social_posts set status='queued' where id=item_id;
  insert into public.automation_jobs(kind,payload) values('social-publish',jsonb_build_object('social_id',item_id));
 else raise exception 'Invalid distribution type';end if;
end; $$;
revoke all on function public.queue_v4_distribution(text,uuid) from public,anon,authenticated;
grant execute on function public.queue_v4_distribution(text,uuid) to service_role;
create function public.finalize_v4_newsletters() returns void language sql security definer set search_path='' as $$
 update public.newsletter_issues i set status=case when exists(select 1 from public.newsletter_deliveries d where d.issue_id=i.id and d.status='failed') then 'failed' else 'sent' end,sent_at=now()
 where i.status='queued' and not exists(select 1 from public.newsletter_deliveries d where d.issue_id=i.id and d.status='pending');
$$;
revoke all on function public.finalize_v4_newsletters() from public,anon,authenticated;
grant execute on function public.finalize_v4_newsletters() to service_role;

COMMIT;

-- 20260916001800_v4_cms_import.sql
BEGIN;
-- Homepage settings and resumable draft imports.
create function public.save_homepage(configuration jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 if jsonb_typeof(configuration->'sections')<>'array' or jsonb_array_length(configuration->'sections')>8 or octet_length(configuration::text)>12000 then raise exception 'Invalid configuration';end if;
 insert into public.site_settings(key,value) values('homepage',configuration) on conflict(key) do update set value=excluded.value;
end;$$;
revoke all on function public.save_homepage(jsonb) from public,anon;
grant execute on function public.save_homepage(jsonb) to authenticated;
create function public.import_draft_row(job uuid,row_no int,payload jsonb,validation_error text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.import_jobs; existing public.import_rows; pid uuid; outcome text:='created'; note text:='';
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 select * into j from public.import_jobs where id=job and created_by=auth.uid() for update;
 if j.id is null or row_no<1 or row_no>j.total_rows or row_no>200 or octet_length(payload::text)>300000 then raise exception 'Invalid import';end if;
 select * into existing from public.import_rows where job_id=job and row_number=row_no;
 if existing.id is not null then return jsonb_build_object('result',existing.result,'message',existing.message);end if;
 if nullif(validation_error,'') is not null then outcome:='error';note:=left(validation_error,1000);
 elsif exists(select 1 from public.posts where slug=payload->>'slug' or (nullif(payload->>'video_url','') is not null and video_url=payload->>'video_url')) then outcome:='duplicate';note:='Existing slug or video';
 else
  begin
   payload:=payload-'id'||jsonb_build_object('status','draft','scheduled_for',null,'meaningful_edit',false);
   pid:=public.save_editor_post(payload);
  exception when unique_violation then outcome:='duplicate';note:='Existing slug or video';
   when others then outcome:='error';note:='Invalid row; check required fields and category';
  end;
 end if;
 insert into public.import_rows(job_id,row_number,raw,result,message,post_id) values(job,row_no,payload,outcome,note,pid);
 update public.import_jobs set processed_rows=processed_rows+1,created_rows=created_rows+case when outcome='created' then 1 else 0 end,duplicate_rows=duplicate_rows+case when outcome='duplicate' then 1 else 0 end,error_rows=error_rows+case when outcome='error' then 1 else 0 end,status=case when processed_rows+1>=total_rows then 'completed' else 'running' end where id=job;
 return jsonb_build_object('result',outcome,'message',note);
end;$$;
revoke all on function public.import_draft_row(uuid,int,jsonb,text) from public,anon;
grant execute on function public.import_draft_row(uuid,int,jsonb,text) to authenticated;

-- Publication permission also applies to non-article publishing surfaces.
create function public.guard_v4_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if to_jsonb(new)->>'status' in ('published','active') and auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
 return new;
end;$$;
do $$ declare tab text;begin
 foreach tab in array array['liveblogs','galleries','web_stories','quizzes','polls','basadis'] loop
 execute format('create trigger publication_guard before insert or update on public.%I for each row execute function public.guard_v4_publication()',tab);
 end loop;
end;$$;

-- Only an explicit, audited administrator takeover can replace another editor's lock.
create or replace function public.v4_post_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare content_changed boolean:=true;
begin
 if tg_op='UPDATE' then
 content_changed:=(to_jsonb(new)-array['locked_by','locked_at','updated_at','search_vector']) is distinct from (to_jsonb(old)-array['locked_by','locked_at','updated_at','search_vector']);
 if old.locked_by is not null and old.locked_by<>auth.uid() and old.locked_at>now()-interval '15 minutes' and auth.role()<>'service_role' then
  if not (public.has_role('admin') and not content_changed and new.locked_by=auth.uid()) then raise exception 'Post is locked by another editor';end if;
 end if;
 end if;
 if content_changed and new.status in ('published','scheduled') then
  if auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
  if new.embargo_until is not null and ((new.status='published' and new.embargo_until>now()) or (new.status='scheduled' and new.scheduled_for<new.embargo_until)) then raise exception 'Embargo has not ended';end if;
  if nullif(trim(new.summary_kn),'') is null or new.event_date is null or nullif(trim(new.image_credit),'') is null or char_length(new.title_kn)>110 then raise exception 'Publication checklist incomplete';end if;
 end if;
 if tg_op='UPDATE' and (new.body_html is distinct from old.body_html or new.title_kn is distinct from old.title_kn) then insert into public.post_versions(post_id,author_id,snapshot) values(old.id,auth.uid(),to_jsonb(old)-'search_vector');end if;
 return new;
end;$$;
create or replace function public.lock_v4_post(target uuid,release boolean default false,takeover boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare p public.posts;
begin
 if not public.can_edit_post(target) then raise exception 'Not permitted';end if;
 select * into p from public.posts where id=target for update;
 if release then if p.locked_by=auth.uid() then update public.posts set locked_by=null,locked_at=null where id=target;return true;end if;return false;end if;
 if p.locked_by is not null and p.locked_by<>auth.uid() and p.locked_at>now()-interval '15 minutes' and not(takeover and public.has_role('admin')) then return false;end if;
 update public.posts set locked_by=auth.uid(),locked_at=now() where id=target;return true;
end;$$;

alter table public.posts add column if not exists breaking_until timestamptz;
alter table public.posts add column if not exists sponsor_name text not null default '';
alter table public.posts add column if not exists allow_comments boolean not null default false;
alter function public.save_editor_post(jsonb) rename to save_editor_post_base;
revoke all on function public.save_editor_post_base(jsonb) from public,anon,authenticated;
create function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; tid uuid;
begin
 pid:=public.save_editor_post_base(payload);
 update public.posts set
  public_author_id=case when payload ? 'public_author_id' then nullif(payload->>'public_author_id','')::uuid else public_author_id end,
  place_id=case when payload ? 'place_id' then nullif(payload->>'place_id','')::uuid else place_id end,
  event_id=case when payload ? 'event_id' then nullif(payload->>'event_id','')::uuid else event_id end,
  is_featured=coalesce((payload->>'is_featured')::boolean,is_featured),
  is_breaking=coalesce((payload->>'is_breaking')::boolean,is_breaking),
  breaking_until=case when payload ? 'breaking_until' then nullif(payload->>'breaking_until','')::timestamptz else breaking_until end,
  is_live=coalesce((payload->>'is_live')::boolean,is_live),
  sponsor_name=coalesce(payload->>'sponsor_name',sponsor_name),
  allow_comments=coalesce((payload->>'allow_comments')::boolean,allow_comments),
  transcript=coalesce(payload->>'transcript',transcript),
  seo_title=coalesce(payload->>'seo_title',seo_title),
  seo_description=coalesce(payload->>'seo_description',seo_description)
 where id=pid;
 if payload ? 'tag_ids' then
  if jsonb_array_length(payload->'tag_ids')>20 then raise exception 'Too many tags';end if;
  delete from public.post_tags where post_id=pid;
  for tid in select value::uuid from jsonb_array_elements_text(payload->'tag_ids') loop insert into public.post_tags(post_id,tag_id) values(pid,tid) on conflict do nothing;end loop;
 end if;
 return pid;
end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;

COMMIT;

-- 20260916001900_v4_push.sql
BEGIN;

create table public.push_preferences(user_id uuid primary key references public.profiles(id) on delete cascade,enabled boolean not null default false,topics text[] not null default array['breaking','live'],quiet_start int not null default 22 check(quiet_start between 0 and 23),quiet_end int not null default 6 check(quiet_end between 0 and 23),daily_cap int not null default 3 check(daily_cap between 1 and 10),breaking_override boolean not null default true,check(topics<@array['breaking','live','daily','events','parva']));
alter table public.push_preferences enable row level security;
create policy own_preferences on public.push_preferences for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,update,delete on public.push_preferences to authenticated;grant all on public.push_preferences to service_role;
create table public.push_campaigns(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id),topic text not null check(topic in ('breaking','live','daily','events','parva')),title text not null check(char_length(title)<=110),body text not null check(char_length(body)<=200),created_by uuid references public.profiles(id),created_at timestamptz not null default now(),unique(post_id,topic));
alter table public.push_campaigns enable row level security;
create policy editorial_read on public.push_campaigns for select to authenticated using(public.has_permission('content.publish'));
grant select on public.push_campaigns to authenticated;grant all on public.push_campaigns to service_role;
create table public.push_deliveries(id uuid primary key default gen_random_uuid(),campaign_id uuid not null references public.push_campaigns(id) on delete cascade,subscription_id uuid references public.push_subscriptions(id) on delete set null,user_id uuid references public.profiles(id) on delete cascade,status text not null default 'pending' check(status in ('pending','sending','sent','skipped','failed')),sent_at timestamptz,clicked_at timestamptz,click_token uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),unique(campaign_id,subscription_id));
alter table public.push_deliveries enable row level security;
create policy editorial_read on public.push_deliveries for select to authenticated using(public.has_permission('analytics.read'));
grant select(id,campaign_id,status,sent_at,clicked_at,created_at) on public.push_deliveries to authenticated;grant all on public.push_deliveries to service_role;
create index push_user_daily on public.push_deliveries(user_id,sent_at);
create function public.queue_v4_push(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare campaign uuid;
begin
 if not public.has_permission('content.publish') or not exists(select 1 from public.provider_settings where id='push' and enabled) then raise exception 'Push unavailable';end if;
 if not exists(select 1 from public.posts where id=(payload->>'post_id')::uuid and status='published' and published_at<=now() and not is_seed and (embargo_until is null or embargo_until<=now())) then raise exception 'Published post required';end if;
 insert into public.push_campaigns(post_id,topic,title,body,created_by) values((payload->>'post_id')::uuid,payload->>'topic',payload->>'title',payload->>'body',auth.uid()) returning id into campaign;
 insert into public.push_deliveries(campaign_id,subscription_id,user_id) select campaign,s.id,s.user_id from public.push_subscriptions s join public.push_preferences p on p.user_id=s.user_id where p.enabled and payload->>'topic'=any(p.topics);
 insert into public.automation_jobs(kind,payload) select 'push-delivery',jsonb_build_object('delivery_id',id) from public.push_deliveries where campaign_id=campaign;
 return campaign;
end;$$;
revoke all on function public.queue_v4_push(jsonb) from public,anon;grant execute on function public.queue_v4_push(jsonb) to authenticated;
create function public.reserve_push_delivery(target uuid) returns text language plpgsql security definer set search_path='' as $$
declare d public.push_deliveries;p public.push_preferences;topic text;hour int:=extract(hour from now() at time zone 'Asia/Kolkata');count_today int;
begin
 select * into d from public.push_deliveries where id=target for update;
 if d.id is null or d.status<>'pending' then return 'skip';end if;
 select * into p from public.push_preferences where user_id=d.user_id for update;
 select c.topic into topic from public.push_campaigns c where c.id=d.campaign_id;
 if not found or p.user_id is null or not p.enabled or not(topic=any(p.topics)) or d.subscription_id is null then update public.push_deliveries set status='skipped' where id=target;return 'skip';end if;
 if not(topic='breaking' and p.breaking_override) and p.quiet_start<>p.quiet_end and ((p.quiet_start<p.quiet_end and hour>=p.quiet_start and hour<p.quiet_end) or (p.quiet_start>p.quiet_end and (hour>=p.quiet_start or hour<p.quiet_end))) then return 'quiet';end if;
 select count(distinct campaign_id) into count_today from public.push_deliveries where user_id=d.user_id and status in ('sending','sent','failed') and (sent_at at time zone 'Asia/Kolkata')::date=(now() at time zone 'Asia/Kolkata')::date and campaign_id<>d.campaign_id;
 if count_today>=p.daily_cap then update public.push_deliveries set status='skipped' where id=target;return 'skip';end if;
 update public.push_deliveries set status='sending',sent_at=now() where id=target;return 'ready';
end;$$;
revoke all on function public.reserve_push_delivery(uuid) from public,anon,authenticated;grant execute on function public.reserve_push_delivery(uuid) to service_role;
create function public.record_push_click(token uuid) returns void language sql security definer set search_path='' as $$update public.push_deliveries set clicked_at=now() where click_token=token and status='sent' and clicked_at is null and sent_at>now()-interval '30 days';$$;
revoke all on function public.record_push_click(uuid) from public,anon,authenticated;grant execute on function public.record_push_click(uuid) to service_role;

create unique index unique_push_job on public.automation_jobs((payload->>'delivery_id')) where kind='push-delivery';

COMMIT;

-- 20260916002000_v4_support.sql
BEGIN;
create table public.payment_refunds(id text primary key,received_at timestamptz not null default now());
alter table public.payment_refunds enable row level security;grant all on public.payment_refunds to service_role;

create table public.support_checkouts(id uuid primary key,user_id uuid not null references public.profiles(id),tier_id text not null,kind text not null check(kind in ('once','monthly','yearly')),amount int not null check(amount>=100),provider_id text unique,status text not null default 'creating' check(status in ('creating','ready','paid','cancelled','failed')),ad_light boolean not null default false,cancel_at_end boolean not null default false,created_at timestamptz not null default now());
alter table public.support_checkouts enable row level security;
create policy own_read on public.support_checkouts for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.support_checkouts to authenticated;grant all on public.support_checkouts to service_role;
create table public.payments(id text primary key,checkout_id uuid not null references public.support_checkouts(id),user_id uuid not null references public.profiles(id),amount int not null,currency text not null check(currency='INR'),status text not null check(status in ('captured','refunded')),paid_at timestamptz not null,period_end timestamptz,receipt_sent_at timestamptz);
alter table public.payments enable row level security;
create policy own_read on public.payments for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.payments to authenticated;grant all on public.payments to service_role;
create table public.supporters(user_id uuid primary key references public.profiles(id),tier_id text not null,valid_until timestamptz not null,ad_light boolean not null default false,updated_at timestamptz not null default now());
alter table public.supporters enable row level security;
create policy own_read on public.supporters for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.supporters to authenticated;grant all on public.supporters to service_role;
create function public.record_support_payment(checkout uuid,payment text,amount_paid int,paid_time timestamptz,period_end timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare c public.support_checkouts;inserted text;
begin
 perform pg_advisory_xact_lock(hashtextextended(payment,0));
 if exists(select 1 from public.payment_refunds where id=payment) then return;end if;
 select * into c from public.support_checkouts where id=checkout for update;
 if c.id is null or c.amount<>amount_paid or payment !~ '^pay_[a-zA-Z0-9]+$' then raise exception 'Payment mismatch';end if;
 if c.kind<>'once' and (period_end is null or period_end<=paid_time or period_end>paid_time+interval '370 days') then raise exception 'Invalid membership period';end if;
 insert into public.payments(id,checkout_id,user_id,amount,currency,status,paid_at,period_end) values(payment,c.id,c.user_id,amount_paid,'INR','captured',paid_time,period_end) on conflict(id) do nothing returning id into inserted;
 if inserted is null then return;end if;
 update public.support_checkouts set status=case when status='cancelled' then status else 'paid' end where id=checkout;
 if c.kind<>'once' then insert into public.supporters(user_id,tier_id,valid_until,ad_light) values(c.user_id,c.tier_id,period_end,c.ad_light) on conflict(user_id) do update set tier_id=case when excluded.valid_until>=public.supporters.valid_until then excluded.tier_id else public.supporters.tier_id end,valid_until=greatest(excluded.valid_until,public.supporters.valid_until),ad_light=case when excluded.valid_until>=public.supporters.valid_until then excluded.ad_light else public.supporters.ad_light end,updated_at=now();end if;
 insert into public.automation_jobs(kind,payload) values('support-receipt',jsonb_build_object('payment_id',payment));
end;$$;
revoke all on function public.record_support_payment(uuid,text,int,timestamptz,timestamptz) from public,anon,authenticated;grant execute on function public.record_support_payment(uuid,text,int,timestamptz,timestamptz) to service_role;
create function public.refund_support_payment(payment text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid;expires timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended(payment,0));
 insert into public.payment_refunds(id) values(payment) on conflict do nothing;
 update public.payments set status='refunded' where id=payment returning user_id into uid;
 if uid is null then return;end if;
 select max(period_end) into expires from public.payments where user_id=uid and status='captured';
 update public.supporters set valid_until=coalesce(expires,now()),updated_at=now() where user_id=uid;
end;$$;
revoke all on function public.refund_support_payment(text) from public,anon,authenticated;grant execute on function public.refund_support_payment(text) to service_role;

create unique index one_open_membership on public.support_checkouts(user_id) where kind<>'once' and status in ('creating','ready','paid');

COMMIT;

-- 20260916002100_v4_comments.sql
BEGIN;

create table public.post_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id) on delete cascade,user_id uuid not null references public.profiles(id),display_name text not null,body text not null check(char_length(body) between 3 and 2000),status text not null default 'pending' check(status in ('pending','approved','rejected')),flagged boolean not null default false,created_at timestamptz not null default now());
create table public.comment_blocks(user_id uuid primary key references public.profiles(id),blocked boolean not null default true);
create table public.comment_reports(comment_id uuid references public.post_comments(id) on delete cascade,user_id uuid references public.profiles(id),reason text not null check(char_length(reason) between 3 and 1000),created_at timestamptz not null default now(),primary key(comment_id,user_id));
alter table public.post_comments enable row level security;alter table public.comment_blocks enable row level security;alter table public.comment_reports enable row level security;
create policy moderate on public.post_comments for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
create policy moderate on public.comment_blocks for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
create policy moderate on public.comment_reports for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,update on public.post_comments to authenticated;grant select,insert,update,delete on public.comment_blocks to authenticated;grant select,delete on public.comment_reports to authenticated;
grant all on public.post_comments,public.comment_blocks,public.comment_reports to service_role;
create function public.submit_post_comment(target uuid,actor uuid,display_name text,body text,flagged boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.posts where id=target and allow_comments and status='published' and published_at<=now() and (embargo_until is null or embargo_until<=now())) then raise exception 'Comments unavailable';end if;
 insert into public.post_comments(post_id,user_id,display_name,body,flagged) values(target,actor,left(display_name,100),body,flagged or exists(select 1 from public.comment_blocks where user_id=actor and blocked));
end;$$;
revoke all on function public.submit_post_comment(uuid,uuid,text,text,boolean) from public,anon,authenticated;grant execute on function public.submit_post_comment(uuid,uuid,text,text,boolean) to service_role;
create function public.public_post_comments(target uuid) returns table(id uuid,display_name text,body text,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select c.id,c.display_name,c.body,c.created_at from public.post_comments c join public.posts p on p.id=c.post_id where c.post_id=target and c.status='approved' and p.status='published' and p.published_at<=now() and (p.embargo_until is null or p.embargo_until<=now()) and p.allow_comments and exists(select 1 from public.site_settings where key='comments' and value->>'enabled'='true') and not exists(select 1 from public.comment_blocks b where b.user_id=c.user_id and b.blocked) order by c.created_at desc limit 100;
$$;
revoke all on function public.public_post_comments(uuid) from public;grant execute on function public.public_post_comments(uuid) to anon,authenticated,service_role;

COMMIT;

-- 20260916002200_v4_media_access.sql
BEGIN;

alter table public.posts add column early_access_until timestamptz;
alter table public.posts add column media_images jsonb not null default '[]' check(jsonb_typeof(media_images)='array' and jsonb_array_length(media_images)<=3);
alter table public.posts add column sponsor_approved_hash text;
create table public.sponsor_reviews(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id) on delete cascade,token_hash text not null unique,content_hash text not null,expires_at timestamptz not null,approved_at timestamptz,created_by uuid references public.profiles(id),created_at timestamptz not null default now());
alter table public.sponsor_reviews enable row level security;
create policy editorial_read on public.sponsor_reviews for select to authenticated using(public.has_permission('content.edit'));
grant select(id,post_id,expires_at,approved_at,created_at) on public.sponsor_reviews to authenticated;grant all on public.sponsor_reviews to service_role;
create function public.sponsor_content_hash(p jsonb) returns text language sql immutable set search_path='' as $$select encode(sha256(convert_to(coalesce(p->>'title_kn','')||'|'||coalesce(p->>'body_html','')||'|'||coalesce(p->>'thumbnail_url','')||'|'||coalesce(p->>'sponsor_name','')||'|'||coalesce((p->'media_images')::text,'[]'),'UTF8')),'hex');$$;
create function public.sponsor_publication_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' and new.sponsor_approved_hash is not null and auth.role()<>'service_role' then raise exception 'Advertiser approval required';end if;
 if tg_op='UPDATE' and new.sponsor_approved_hash is distinct from old.sponsor_approved_hash and auth.role()<>'service_role' then raise exception 'Advertiser approval required';end if;
 if new.sponsor_name<>'' and new.status in ('published','scheduled') and new.sponsor_approved_hash is distinct from public.sponsor_content_hash(to_jsonb(new)) then raise exception 'Advertiser must approve this version before publication';end if;
 return new;
end;$$;
create trigger sponsor_guard before insert or update on public.posts for each row execute function public.sponsor_publication_guard();
create function public.approve_sponsor_review(token text) returns boolean language plpgsql security definer set search_path='' as $$
declare review public.sponsor_reviews;p public.posts;
begin
 select * into review from public.sponsor_reviews where token_hash=token and expires_at>now() for update;
 if review.id is null then return false;end if;
 select * into p from public.posts where id=review.post_id for update;
 if p.id is null or review.content_hash is distinct from public.sponsor_content_hash(to_jsonb(p)) then return false;end if;
 update public.posts set sponsor_approved_hash=review.content_hash where id=p.id;
 update public.sponsor_reviews set approved_at=now() where id=review.id;return true;
end;$$;
revoke all on function public.approve_sponsor_review(text) from public,anon,authenticated;grant execute on function public.approve_sponsor_review(text) to service_role;
create function public.can_read_early_content(until_time timestamptz) returns boolean language sql stable security definer set search_path='' as $$
 select until_time is null or until_time<=now() or public.has_permission('content.read') or exists(select 1 from public.supporters where user_id=auth.uid() and valid_until>now());
$$;
create policy early_access_guard on public.posts as restrictive for select using(public.can_read_early_content(early_access_until));
drop policy site_assets_insert on storage.objects;
drop policy site_assets_update on storage.objects;
create policy site_assets_insert on storage.objects for insert to authenticated with check(bucket_id='site-assets' and (public.has_permission('content.edit') or public.has_permission('content.create') or public.has_permission('ads.manage')));
create policy site_assets_update on storage.objects for update to authenticated using(bucket_id='site-assets' and (public.has_permission('content.edit') or public.has_permission('ads.manage'))) with check(bucket_id='site-assets' and (public.has_permission('content.edit') or public.has_permission('ads.manage')));
create or replace function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; tid uuid;
begin
 pid:=public.save_editor_post_base(payload);
 update public.posts set
  early_access_until=case when payload ? 'early_access_until' then nullif(payload->>'early_access_until','')::timestamptz else early_access_until end,
  media_images=coalesce(payload->'media_images',media_images),
  audio_enabled=coalesce((payload->>'audio_enabled')::boolean,audio_enabled),
  public_author_id=case when payload ? 'public_author_id' then nullif(payload->>'public_author_id','')::uuid else public_author_id end,
  place_id=case when payload ? 'place_id' then nullif(payload->>'place_id','')::uuid else place_id end,
  event_id=case when payload ? 'event_id' then nullif(payload->>'event_id','')::uuid else event_id end,
  is_featured=coalesce((payload->>'is_featured')::boolean,is_featured),
  is_breaking=coalesce((payload->>'is_breaking')::boolean,is_breaking),
  breaking_until=case when payload ? 'breaking_until' then nullif(payload->>'breaking_until','')::timestamptz else breaking_until end,
  is_live=coalesce((payload->>'is_live')::boolean,is_live),
  sponsor_name=coalesce(payload->>'sponsor_name',sponsor_name),
  allow_comments=coalesce((payload->>'allow_comments')::boolean,allow_comments),
  transcript=coalesce(payload->>'transcript',transcript),
  seo_title=coalesce(payload->>'seo_title',seo_title),
  seo_description=coalesce(payload->>'seo_description',seo_description)
 where id=pid;
 if payload ? 'tag_ids' then
  if jsonb_array_length(payload->'tag_ids')>20 then raise exception 'Too many tags';end if;
  delete from public.post_tags where post_id=pid;
  for tid in select value::uuid from jsonb_array_elements_text(payload->'tag_ids') loop insert into public.post_tags(post_id,tag_id) values(pid,tid) on conflict do nothing;end loop;
 end if;
 return pid;
end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;

create or replace function public.submit_post_comment(target uuid,actor uuid,display_name text,body text,flagged boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.posts where id=target and allow_comments and status='published' and published_at<=now() and (embargo_until is null or embargo_until<=now()) and (early_access_until is null or early_access_until<=now())) then raise exception 'Comments unavailable';end if;
 insert into public.post_comments(post_id,user_id,display_name,body,flagged) values(target,actor,left(display_name,100),body,flagged or exists(select 1 from public.comment_blocks where user_id=actor and blocked));
end;$$;
revoke all on function public.submit_post_comment(uuid,uuid,text,text,boolean) from public,anon,authenticated;grant execute on function public.submit_post_comment(uuid,uuid,text,text,boolean) to service_role;
create or replace function public.public_post_comments(target uuid) returns table(id uuid,display_name text,body text,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select c.id,c.display_name,c.body,c.created_at from public.post_comments c join public.posts p on p.id=c.post_id where c.post_id=target and c.status='approved' and p.status='published' and p.published_at<=now() and (p.embargo_until is null or p.embargo_until<=now()) and (p.early_access_until is null or p.early_access_until<=now()) and p.allow_comments and exists(select 1 from public.site_settings where key='comments' and value->>'enabled'='true') and not exists(select 1 from public.comment_blocks b where b.user_id=c.user_id and b.blocked) order by c.created_at desc limit 100;
$$;
revoke all on function public.public_post_comments(uuid) from public;grant execute on function public.public_post_comments(uuid) to anon,authenticated,service_role;

create or replace function public.queue_v4_push(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare campaign uuid;
begin
 if not public.has_permission('content.publish') or not exists(select 1 from public.provider_settings where id='push' and enabled) then raise exception 'Push unavailable';end if;
 if not exists(select 1 from public.posts where id=(payload->>'post_id')::uuid and status='published' and published_at<=now() and not is_seed and (embargo_until is null or embargo_until<=now()) and (early_access_until is null or early_access_until<=now())) then raise exception 'Published post required';end if;
 insert into public.push_campaigns(post_id,topic,title,body,created_by) values((payload->>'post_id')::uuid,payload->>'topic',payload->>'title',payload->>'body',auth.uid()) returning id into campaign;
 insert into public.push_deliveries(campaign_id,subscription_id,user_id) select campaign,s.id,s.user_id from public.push_subscriptions s join public.push_preferences p on p.user_id=s.user_id where p.enabled and payload->>'topic'=any(p.topics);
 insert into public.automation_jobs(kind,payload) select 'push-delivery',jsonb_build_object('delivery_id',id) from public.push_deliveries where campaign_id=campaign;
 return campaign;
end;$$;
revoke all on function public.queue_v4_push(jsonb) from public,anon;grant execute on function public.queue_v4_push(jsonb) to authenticated;

COMMIT;

-- 20260916002300_v4_utility_import.sql
BEGIN;
create unique index calendar_import_identity on public.jain_calendar_days(date,title_kn);
create unique index rates_import_identity on public.market_rates(rate_date,kind,place_id) nulls not distinct;

COMMIT;

-- 20260916002400_v4_chapters.sql
BEGIN;
alter function public.save_editor_post(jsonb) rename to save_editor_post_media;
revoke all on function public.save_editor_post_media(jsonb) from public,anon,authenticated;
create function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare pid uuid;point jsonb;position integer:=0;begin pid:=public.save_editor_post_media(payload);if payload ? 'key_points' then if jsonb_typeof(payload->'key_points')<>'array' or jsonb_array_length(payload->'key_points')>100 then raise exception 'Invalid chapters';end if;delete from public.key_points where post_id=pid;for point in select value from jsonb_array_elements(payload->'key_points') loop if (point->>'seconds')::int not between 0 and 172800 or char_length(point->>'label_kn') not between 1 and 300 then raise exception 'Invalid chapter';end if;insert into public.key_points(post_id,seconds,label_kn,sort_order) values(pid,(point->>'seconds')::int,point->>'label_kn',position);position:=position+1;end loop;end if;return pid;end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;grant execute on function public.save_editor_post(jsonb) to authenticated;

COMMIT;

-- 20260916002500_v4_reminders.sql
BEGIN;
create table public.calendar_reminders(user_id uuid references public.profiles(id) on delete cascade,day_id uuid references public.jain_calendar_days(id) on delete cascade,created_at timestamptz not null default now(),primary key(user_id,day_id));
alter table public.calendar_reminders enable row level security;create policy own_reminders on public.calendar_reminders for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());grant select,insert,delete on public.calendar_reminders to authenticated;grant all on public.calendar_reminders to service_role;
alter table public.push_campaigns alter column post_id drop not null;
alter table public.push_campaigns add column target_path text;
alter table public.push_campaigns add column reminder_key text unique;
alter table public.push_campaigns add column source_id uuid;
alter table public.push_campaigns add constraint push_target_required check(post_id is not null or (target_path like '/%' and target_path not like '//%' and reminder_key is not null));
create function public.queue_due_reminders() returns integer language plpgsql security definer set search_path='' as $$declare item record;campaign uuid;added integer:=0;day date:=(now() at time zone 'Asia/Kolkata')::date;begin
if not exists(select 1 from public.provider_settings where id='push' and enabled) or extract(hour from now() at time zone 'Asia/Kolkata')<7 then return 0;end if;
for item in select id,name_kn title,start_date date,'events' topic,'/events/'||slug path from public.events where not is_seed and start_date between day and day+1 union all select id,title_kn,date,'parva','/jain-calendar' from public.jain_calendar_days where not is_seed and date between day and day+1 loop
insert into public.push_campaigns(topic,title,body,target_path,reminder_key,source_id) values(item.topic,left(item.title,110),item.date::text,item.path,item.topic||':'||item.id||':'||item.date,item.id) on conflict(reminder_key) do update set title=excluded.title,body=excluded.body,target_path=excluded.target_path returning id into campaign;
insert into public.push_deliveries(campaign_id,subscription_id,user_id) select campaign,s.id,s.user_id from public.push_subscriptions s join public.push_preferences p on p.user_id=s.user_id where p.enabled and item.topic=any(p.topics) and ((item.topic='events' and exists(select 1 from public.event_reminders r where r.user_id=s.user_id and r.event_id=item.id and r.channel='push')) or (item.topic='parva' and exists(select 1 from public.calendar_reminders r where r.user_id=s.user_id and r.day_id=item.id))) on conflict(campaign_id,subscription_id) do nothing;
insert into public.automation_jobs(kind,payload) select 'push-delivery',jsonb_build_object('delivery_id',d.id) from public.push_deliveries d where d.campaign_id=campaign and d.status='pending' on conflict do nothing;added:=added+1;
end loop;return added;end;$$;
revoke all on function public.queue_due_reminders() from public,anon,authenticated;grant execute on function public.queue_due_reminders() to service_role;

COMMIT;

-- 20260916002600_v4_reactions.sql
BEGIN;
create function public.public_reaction_counts(target uuid) returns table(kind text,count bigint) language sql stable security definer set search_path='' as $$select r.kind,count(*) from public.reactions r join public.posts p on p.id=r.post_id where p.id=target and p.status='published' and p.published_at<=now() and (p.embargo_until is null or p.embargo_until<=now()) and (p.early_access_until is null or p.early_access_until<=now()) group by r.kind;$$;
revoke all on function public.public_reaction_counts(uuid) from public;grant execute on function public.public_reaction_counts(uuid) to anon,authenticated,service_role;

COMMIT;

-- 20260916002700_v4_multiple_polls.sql
BEGIN;
alter table public.polls add column multiple_choice boolean not null default false;
alter table public.poll_votes add column option_indexes integer[];
update public.poll_votes set option_indexes=array[option_index];
alter table public.poll_votes add constraint poll_choices_size check(cardinality(option_indexes) between 1 and 8);
create function public.record_v4_votes(poll uuid,choices integer[],device text,actor uuid default null) returns void language plpgsql security definer set search_path='' as $$declare current_poll public.polls;begin select * into current_poll from public.polls where id=poll for share;if not found or current_poll.status<>'active' or current_poll.ends_at<=now() then raise exception 'Poll closed';end if;if choices is null or cardinality(choices) not between 1 and 8 or (not current_poll.multiple_choice and cardinality(choices)<>1) or (select count(distinct c) from unnest(choices) c)<>cardinality(choices) or exists(select 1 from unnest(choices) c where c is null or c<0 or c>=jsonb_array_length(current_poll.options)) then raise exception 'Invalid choices';end if;insert into public.poll_votes(poll_id,option_index,option_indexes,user_id,device_hash) values(poll,choices[1],choices,actor,device);end;$$;
revoke all on function public.record_v4_votes(uuid,integer[],text,uuid) from public,anon,authenticated;grant execute on function public.record_v4_votes(uuid,integer[],text,uuid) to service_role;
create or replace function public.record_v4_vote(poll uuid,choice integer,device text,actor uuid default null) returns void language sql security definer set search_path='' as $$select public.record_v4_votes(poll,array[choice],device,actor);$$;
create or replace function public.v4_poll_results(poll uuid) returns table(option_index integer,votes bigint) language sql stable security definer set search_path='' as $$select c,count(*) from public.poll_votes v join public.polls p on p.id=v.poll_id cross join lateral unnest(coalesce(v.option_indexes,array[v.option_index])) c where p.id=poll and p.status in ('active','closed') group by c order by c;$$;

COMMIT;

-- 20260916002800_v4_listing.sql
BEGIN;
create function public.list_public_posts(filters jsonb default '{}',page_size integer default 12,page_offset integer default 0) returns table(post jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
select (to_jsonb(p)-'body_html'-'body_json'-'transcript'-'body_en')||jsonb_build_object('body_html','','category_slugs',coalesce((select jsonb_agg(c.slug) from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id),'[]'::jsonb),'tags',coalesce((select jsonb_agg(jsonb_build_object('slug',t.slug,'name_kn',t.name_kn)) from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id),'[]'::jsonb)),count(*) over()
from public.posts p where p.status='published' and p.published_at<=now()
and (coalesce(filters->>'mode','')='event_date' or coalesce(jsonb_array_length(filters->'terms'),0)=0 or exists(select 1 from jsonb_array_elements_text(filters->'terms') term where position(lower(term) in lower(p.title_kn||' '||coalesce(p.title_en,'')||' '||coalesce(p.title_translit,'')||' '||coalesce(p.summary_kn,'')||' '||coalesce(p.event_place,'')))>0))
and (nullif(filters->>'from','') is null or p.event_date>=(filters->>'from')::date) and (nullif(filters->>'to','') is null or p.event_date<=(filters->>'to')::date)
and (nullif(filters->>'year','') is null or extract(year from p.event_date)::text=filters->>'year')
and (nullif(filters->>'place','') is null or p.event_place=filters->>'place')
and (nullif(filters->>'type','') is null or p.type::text=filters->>'type')
and (nullif(filters->>'category','') is null or exists(select 1 from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id and c.slug=filters->>'category'))
and (nullif(filters->>'tag','') is null or exists(select 1 from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id and t.slug=filters->>'tag'))
and (nullif(filters->>'author','') is null or exists(select 1 from public.authors a where a.id=p.public_author_id and a.slug=filters->>'author'))
order by case when filters->>'sort'='oldest' then p.published_at end asc,case when filters->>'sort'='event_date' then p.event_date end desc,case when filters->>'sort'='most_viewed' then p.view_count end desc,p.published_at desc,p.id
limit greatest(1,least(page_size,50)) offset greatest(0,least(page_offset,500000));
$$;
revoke all on function public.list_public_posts(jsonb,integer,integer) from public;grant execute on function public.list_public_posts(jsonb,integer,integer) to anon,authenticated;

COMMIT;

-- 20260916002900_v4_contributors.sql
BEGIN;
create table public.contributor_applications(user_id uuid primary key references public.profiles(id) on delete cascade,place_id uuid not null references public.places(id),note text not null check(char_length(note) between 10 and 2000),status text not null default 'pending' check(status in ('pending','approved','rejected')),approved_by uuid references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.contributor_applications enable row level security;create policy own_read on public.contributor_applications for select to authenticated using(user_id=auth.uid() or public.has_permission('users.manage'));grant select on public.contributor_applications to authenticated;grant all on public.contributor_applications to service_role;
create function public.apply_contributor(place uuid,message text) returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and phone_confirmed_at is not null) then raise exception 'Verify your phone with OTP first';end if;if char_length(message) not between 10 and 2000 then raise exception 'Invalid note';end if;insert into public.contributor_applications(user_id,place_id,note) values(auth.uid(),place,message) on conflict(user_id) do update set place_id=excluded.place_id,note=excluded.note,status='pending',approved_by=null,updated_at=now() where contributor_applications.status<>'approved';end;$$;
revoke all on function public.apply_contributor(uuid,text) from public,anon;grant execute on function public.apply_contributor(uuid,text) to authenticated;
create function public.review_contributor(target uuid,decision text) returns void language plpgsql security definer set search_path='' as $$declare application public.contributor_applications;begin if not public.has_permission('users.manage') or decision not in ('approved','rejected') then raise exception 'Not permitted';end if;select * into application from public.contributor_applications where user_id=target for update;if application.user_id is null then raise exception 'Application missing';end if;if decision='approved' and not exists(select 1 from auth.users where id=target and phone_confirmed_at is not null) then raise exception 'Phone verification required';end if;update public.contributor_applications set status=decision,approved_by=auth.uid(),updated_at=now() where user_id=target;if decision='approved' then update public.profiles set role='contributor',preferred_place_id=application.place_id where id=target;insert into public.authors(profile_id,slug,name_kn,role_kn,is_active) select id,'contributor-'||id,coalesce(nullif(full_name,''),'ನಾಗರಿಕ ವರದಿಗಾರ'),'ನಾಗರಿಕ ವರದಿಗಾರ',true from public.profiles where id=target and not exists(select 1 from public.authors where profile_id=target);end if;end;$$;
revoke all on function public.review_contributor(uuid,text) from public,anon;grant execute on function public.review_contributor(uuid,text) to authenticated;
create or replace function public.has_permission(requested text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles p where p.id=auth.uid() and (p.role='admin' or (exists(select 1 from public.role_permissions rp where rp.role=p.role::text and rp.permission=requested and rp.allowed) and (p.role<>'contributor' or (requested in ('admin.access','content.create') and exists(select 1 from public.contributor_applications c join auth.users u on u.id=c.user_id where c.user_id=p.id and c.status='approved' and u.phone_confirmed_at is not null))))));$$;
create function public.contributor_post_defaults() returns trigger language plpgsql security definer set search_path='' as $$begin if exists(select 1 from public.profiles where id=auth.uid() and role='contributor') then if new.status<>'draft' or new.author_id<>auth.uid() then raise exception 'Contributor drafts require editorial review';end if;select place_id into new.place_id from public.contributor_applications where user_id=auth.uid() and status='approved';select id into new.public_author_id from public.authors where profile_id=auth.uid() and is_active order by created_at limit 1;end if;return new;end;$$;
create trigger contributor_defaults before insert or update on public.posts for each row execute function public.contributor_post_defaults();

COMMIT;

-- 20260916003000_v4_discovery.sql
BEGIN;
create or replace function public.list_public_posts(filters jsonb default '{}',page_size integer default 12,page_offset integer default 0) returns table(post jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
select (to_jsonb(p)-'body_html'-'body_json'-'transcript'-'body_en')||jsonb_build_object('body_html','','category_slugs',coalesce((select jsonb_agg(c.slug) from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id),'[]'::jsonb),'tags',coalesce((select jsonb_agg(jsonb_build_object('slug',t.slug,'name_kn',t.name_kn)) from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id),'[]'::jsonb)),count(*) over()
from public.posts p where p.status='published' and p.published_at<=now()
and (coalesce(filters->>'mode','')='event_date' or coalesce(jsonb_array_length(filters->'terms'),0)=0 or exists(select 1 from jsonb_array_elements_text(filters->'terms') term where position(lower(term) in lower(p.title_kn||' '||coalesce(p.title_en,'')||' '||coalesce(p.title_translit,'')||' '||coalesce(p.summary_kn,'')||' '||coalesce(p.event_place,'')))>0))
and (nullif(filters->>'from','') is null or p.event_date>=(filters->>'from')::date) and (nullif(filters->>'to','') is null or p.event_date<=(filters->>'to')::date)
and (nullif(filters->>'year','') is null or extract(year from p.event_date)::text=filters->>'year')
and (nullif(filters->>'place','') is null or p.event_place=filters->>'place')
and (nullif(filters->>'type','') is null or p.type::text=filters->>'type')
and (nullif(filters->>'category','') is null or exists(select 1 from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id and c.slug=filters->>'category'))
and (nullif(filters->>'tag','') is null or exists(select 1 from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id and t.slug=filters->>'tag'))
and (nullif(filters->>'author','') is null or exists(select 1 from public.authors a where a.id=p.public_author_id and a.slug=filters->>'author'))
and (nullif(filters->>'place_id','') is null or p.place_id=(filters->>'place_id')::uuid or p.event_place=(select name_kn from public.places where id=(filters->>'place_id')::uuid))
and (coalesce(filters->>'media','')<>'true' or p.type in ('video','short'))
and (coalesce(filters->>'live','')<>'true' or p.is_live)
and (nullif(filters->>'series','') is null or exists(select 1 from public.series_items si join public.series s on s.id=si.series_id where si.post_id=p.id and s.slug=filters->>'series' and s.is_active))
and (nullif(filters->>'topic','') is null or exists(select 1 from public.topics t where t.slug=filters->>'topic' and t.is_active and (exists(select 1 from public.topic_pins tp where tp.topic_id=t.id and tp.post_id=p.id) or exists(select 1 from public.post_tags pt where pt.post_id=p.id and pt.tag_id=any(t.tag_ids)))))
order by (select tp.sort_order from public.topic_pins tp join public.topics t on t.id=tp.topic_id where tp.post_id=p.id and t.slug=filters->>'topic' limit 1) asc nulls last, (select si.episode_no from public.series_items si join public.series s on s.id=si.series_id where si.post_id=p.id and s.slug=filters->>'series' limit 1) asc,
case when filters->>'sort'='oldest' then p.published_at end asc,case when filters->>'sort'='event_date' then p.event_date end desc,case when filters->>'sort'='most_viewed' then p.view_count end desc,p.published_at desc,p.id
limit greatest(1,least(page_size,50)) offset greatest(0,least(page_offset,500000));
$$;
revoke all on function public.list_public_posts(jsonb,integer,integer) from public;grant execute on function public.list_public_posts(jsonb,integer,integer) to anon,authenticated;

COMMIT;

-- 20260916003100_v4_job_controls.sql
BEGIN;
alter table public.automation_jobs drop constraint automation_jobs_status_check;
alter table public.automation_jobs add constraint automation_jobs_status_check check(status in ('pending','running','done','failed','cancelled'));
create function public.expire_stalled_jobs() returns void language sql security definer set search_path='' as $$update public.automation_jobs set status='failed',last_error='Worker lease expired; review external delivery before retry.' where status='running' and locked_at<now()-interval '15 minutes';$$;
revoke all on function public.expire_stalled_jobs() from public,anon,authenticated;grant execute on function public.expire_stalled_jobs() to service_role;
create function public.manage_v4_job(target uuid,action text,delivery_checked boolean default false) returns void language plpgsql security definer set search_path='' as $$declare j public.automation_jobs;begin
if not public.has_permission('settings.manage') or action not in ('retry','cancel') then raise exception 'Not permitted';end if;
select * into j from public.automation_jobs where id=target for update;if j.id is null or j.status not in ('pending','failed') then raise exception 'Job is not available';end if;
if action='cancel' then if j.kind='newsletter-delivery' then update public.newsletter_deliveries set status='skipped' where id=(j.payload->>'delivery_id')::uuid and status in ('pending','failed');end if; if j.kind='push-delivery' then update public.push_deliveries set status='skipped' where id=(j.payload->>'delivery_id')::uuid and status in ('pending','failed','sending');end if;
if j.kind='social-publish' then update public.social_posts set status='draft' where id=(j.payload->>'social_id')::uuid and status in ('queued','failed');end if; update public.automation_jobs set status='cancelled' where id=target;return;end if;
if j.status<>'failed' then raise exception 'Only failed jobs may be retried';end if;
if j.kind<>'article-audio' and not delivery_checked then raise exception 'Check external delivery before retry';end if;
if j.kind in ('newsletter-delivery','support-receipt') and j.created_at<now()-interval '20 hours' then raise exception 'Provider idempotency window expired; create a reviewed replacement';end if;
if j.kind='push-delivery' then update public.push_deliveries set status='pending',sent_at=null where id=(j.payload->>'delivery_id')::uuid and status in ('failed','sending');end if;
if j.kind='social-publish' then update public.social_posts set status='queued',error=null where id=(j.payload->>'social_id')::uuid and status='failed';end if;
if j.kind='newsletter-delivery' then update public.newsletter_deliveries set status='pending' where id=(j.payload->>'delivery_id')::uuid and status='failed';update public.newsletter_issues set status='queued' where id=(select issue_id from public.newsletter_deliveries where id=(j.payload->>'delivery_id')::uuid) and status='failed';end if;
update public.automation_jobs set status='pending',attempts=0,locked_at=null,run_after=now(),last_error=null where id=target;
end;$$;revoke all on function public.manage_v4_job(uuid,text,boolean) from public,anon;grant execute on function public.manage_v4_job(uuid,text,boolean) to authenticated;

create policy manager_read on public.automation_jobs for select to authenticated using(public.has_permission('settings.manage'));grant select(id,kind,status,attempts,run_after,last_error,created_at) on public.automation_jobs to authenticated;

COMMIT;

-- 20260916003200_v4_draft_recovery.sql
BEGIN;
create table public.editor_recovery(user_id uuid not null references public.profiles(id) on delete cascade,draft_key text not null check(char_length(draft_key)<=100),post_id uuid references public.posts(id) on delete cascade,snapshot jsonb not null check(octet_length(snapshot::text)<=300000),updated_at timestamptz not null default now(),primary key(user_id,draft_key));
alter table public.editor_recovery enable row level security;
create policy own_recovery on public.editor_recovery for all to authenticated using(user_id=auth.uid() and public.has_permission('admin.access')) with check(user_id=auth.uid() and (public.has_permission('content.create') or public.has_permission('content.edit')) and (post_id is null or public.can_edit_post(post_id)));
grant select,insert,update,delete on public.editor_recovery to authenticated;grant all on public.editor_recovery to service_role;

COMMIT;

-- 20260916003300_v4_translations.sql
BEGIN;
alter table public.posts add column summary_en text not null default '';alter table public.posts add column body_en text not null default '';
alter function public.save_editor_post(jsonb) rename to save_editor_post_chapters;
revoke all on function public.save_editor_post_chapters(jsonb) from public,anon,authenticated;
create function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare target uuid;begin target:=public.save_editor_post_chapters(payload);if char_length(coalesce(payload->>'body_en',''))>200000 or char_length(coalesce(payload->>'summary_en',''))>1000 then raise exception 'Translation too long';end if;update public.posts set body_en=coalesce(payload->>'body_en',''),summary_en=coalesce(payload->>'summary_en','') where id=target;return target;end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;grant execute on function public.save_editor_post(jsonb) to authenticated;
create or replace function public.sponsor_content_hash(p jsonb) returns text language sql immutable set search_path='' as $$select encode(sha256(convert_to(jsonb_build_object('title_kn',p->>'title_kn','body_html',p->>'body_html','summary_kn',p->>'summary_kn','thumbnail_url',p->>'thumbnail_url','image_credit',p->>'image_credit','sponsor_name',p->>'sponsor_name','media_images',coalesce(p->'media_images','[]'::jsonb),'summary_points',coalesce(p->'summary_points','[]'::jsonb),'title_en',p->>'title_en','summary_en',coalesce(p->>'summary_en',''),'body_en',coalesce(p->>'body_en',''),'video_url',p->>'video_url','transcript',p->>'transcript')::text,'UTF8')),'hex');$$;

COMMIT;

-- 20260916003400_v4_notice_billing.sql
BEGIN;
create table public.notice_billing(notice_id uuid primary key references public.notices(id) on delete cascade,amount_paise integer not null check(amount_paise between 100 and 100000000),payment_url text not null check(payment_url ~ '^https://(rzp[.]io|pages[.]razorpay[.]com)/'),status text not null default 'pending' check(status in ('pending','paid','waived')),payment_reference text not null default '',reviewed_by uuid references public.profiles(id),updated_at timestamptz not null default now(),check(status<>'paid' or char_length(payment_reference)>=4));alter table public.notice_billing enable row level security;
create policy billing_read on public.notice_billing for select to authenticated using(public.has_permission('ads.manage') or public.has_permission('community.manage'));
create policy billing_manage on public.notice_billing for all to authenticated using(public.has_permission('ads.manage')) with check(public.has_permission('ads.manage'));
grant select,insert,update on public.notice_billing to authenticated;grant all on public.notice_billing to service_role;
create function public.notice_payment_guard() returns trigger language plpgsql security definer set search_path='' as $$begin if new.status='approved' and exists(select 1 from public.notice_billing where notice_id=new.id and status='pending') then raise exception 'Notice payment must be reviewed before approval';end if;return new;end;$$;
create trigger notice_payment before insert or update on public.notices for each row execute function public.notice_payment_guard();
create trigger audit_billing after insert or update on public.notice_billing for each row execute function public.audit_content();

create function public.notice_billing_guard() returns trigger language plpgsql security definer set search_path='' as $$declare state text;begin select status into state from public.notices where id=new.notice_id for update;if state='approved' and new.status='pending' then raise exception 'Unapprove notice before requesting payment';end if;new.reviewed_by:=auth.uid();return new;end;$$;create trigger billing_guard before insert or update on public.notice_billing for each row execute function public.notice_billing_guard();

COMMIT;

-- 20260916003500_v4_bulletin_schedule.sql
BEGIN;
alter table public.newsletter_issues add column schedule_key text unique;alter table public.social_posts add column schedule_key text unique;
insert into public.site_settings(key,value) values('distribution_schedule','{"enabled":false,"hours":[7,18],"networks":["newsletter","telegram"]}') on conflict do nothing;

COMMIT;

-- 20260916003600_location_filters.sql
BEGIN;
-- Existing catalog contains Karnataka places. Future places explicitly record their state.
alter table public.places add column if not exists state text not null default 'Karnataka' check (length(trim(state)) between 1 and 150);
create index if not exists places_location_idx on public.places(state,district,slug);
create or replace function public.list_public_posts(filters jsonb default '{}',page_size integer default 12,page_offset integer default 0) returns table(post jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
select (to_jsonb(p)-'body_html'-'body_json'-'transcript'-'body_en')||jsonb_build_object('body_html','','category_slugs',coalesce((select jsonb_agg(c.slug) from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id),'[]'::jsonb),'tags',coalesce((select jsonb_agg(jsonb_build_object('slug',t.slug,'name_kn',t.name_kn)) from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id),'[]'::jsonb)),count(*) over()
from public.posts p where p.status='published' and p.published_at<=now()
and (coalesce(filters->>'mode','')='event_date' or coalesce(jsonb_array_length(filters->'terms'),0)=0 or exists(select 1 from jsonb_array_elements_text(filters->'terms') term where position(lower(term) in lower(p.title_kn||' '||coalesce(p.title_en,'')||' '||coalesce(p.title_translit,'')||' '||coalesce(p.summary_kn,'')||' '||coalesce(p.event_place,'')))>0))
and (nullif(filters->>'from','') is null or p.event_date>=(filters->>'from')::date) and (nullif(filters->>'to','') is null or p.event_date<=(filters->>'to')::date)
and (nullif(filters->>'year','') is null or extract(year from p.event_date)::text=filters->>'year')
and (nullif(filters->>'place','') is null or p.event_place=filters->>'place')
and ((nullif(filters->>'state','') is null and nullif(filters->>'district','') is null and nullif(filters->>'city','') is null) or exists (
 select 1 from public.places geo where (geo.id=p.place_id or (p.place_id is null and lower(trim(p.event_place)) in (lower(geo.name_kn),lower(geo.name_en),lower(geo.slug))))
 and (nullif(filters->>'state','') is null or geo.state=filters->>'state')
 and (nullif(filters->>'district','') is null or geo.district=filters->>'district')
 and (nullif(filters->>'city','') is null or (not geo.is_district and geo.slug=filters->>'city'))
))
and (nullif(filters->>'type','') is null or p.type::text=filters->>'type')
and (nullif(filters->>'category','') is null or exists(select 1 from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id and c.slug=filters->>'category'))
and (nullif(filters->>'tag','') is null or exists(select 1 from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id and t.slug=filters->>'tag'))
and (nullif(filters->>'author','') is null or exists(select 1 from public.authors a where a.id=p.public_author_id and a.slug=filters->>'author'))
and (nullif(filters->>'place_id','') is null or p.place_id=(filters->>'place_id')::uuid or p.event_place=(select name_kn from public.places where id=(filters->>'place_id')::uuid))
and (coalesce(filters->>'media','')<>'true' or p.type in ('video','short'))
and (coalesce(filters->>'live','')<>'true' or p.is_live)
and (nullif(filters->>'series','') is null or exists(select 1 from public.series_items si join public.series s on s.id=si.series_id where si.post_id=p.id and s.slug=filters->>'series' and s.is_active))
and (nullif(filters->>'topic','') is null or exists(select 1 from public.topics t where t.slug=filters->>'topic' and t.is_active and (exists(select 1 from public.topic_pins tp where tp.topic_id=t.id and tp.post_id=p.id) or exists(select 1 from public.post_tags pt where pt.post_id=p.id and pt.tag_id=any(t.tag_ids)))))
order by (select tp.sort_order from public.topic_pins tp join public.topics t on t.id=tp.topic_id where tp.post_id=p.id and t.slug=filters->>'topic' limit 1) asc nulls last, (select si.episode_no from public.series_items si join public.series s on s.id=si.series_id where si.post_id=p.id and s.slug=filters->>'series' limit 1) asc,
case when filters->>'sort'='oldest' then p.published_at end asc,case when filters->>'sort'='event_date' then p.event_date end desc,case when filters->>'sort'='most_viewed' then p.view_count end desc,p.published_at desc,p.id
limit greatest(1,least(page_size,50)) offset greatest(0,least(page_offset,500000));
$$;
revoke all on function public.list_public_posts(jsonb,integer,integer) from public;grant execute on function public.list_public_posts(jsonb,integer,integer) to anon,authenticated;

COMMIT;

-- 20260917110909_promote_first_user_to_admin.sql
BEGIN;
/*
# Auto-promote first user to admin role

## Changes
- Replaces the `handle_new_user` trigger function so that the very first
  user to sign up is automatically assigned the `admin` role.
- All subsequent users continue to receive the default `reader` role.
- This ensures the site owner can immediately access the admin dashboard
  after their first signup without needing manual database edits.

## Security
- The function is SECURITY DEFINER (runs as the table owner) so it can
  write to `profiles` regardless of RLS.
- Only the first profile row ever created gets `admin`; the check is
  atomic (count within the INSERT).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _role public.user_role;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    _role := 'admin';
  ELSE
    _role := 'reader';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100),
    new.phone,
    _role
  );

  RETURN new;
END;
$$;

COMMIT;

-- 20260918000100_secure_account_creation.sql
BEGIN;
-- Public signup always creates a reader, including the first account.
-- Assign administrators explicitly with trusted server/database credentials.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100), new.phone, 'reader');
  return new;
end;
$$;

-- Read-only readiness check for trusted setup tooling. Never expose function
-- source or privileged configuration through the public API.
create or replace function public.account_security_ready()
returns boolean language sql stable security definer set search_path = '' as $$
  select position('''reader''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
    and position('''admin''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) = 0;
$$;
revoke all on function public.account_security_ready() from public, anon, authenticated;
grant execute on function public.account_security_ready() to service_role;

COMMIT;