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
