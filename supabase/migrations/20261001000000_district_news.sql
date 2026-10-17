-- District-wise news (/districts): editors choose which district records appear, their order, and how each is introduced.
-- Kannada stays the source of record; empty string means "not translated yet".
alter table public.places add column if not exists sort_order integer not null default 0;
alter table public.places add column if not exists show_in_district_news boolean not null default true;
alter table public.places add column if not exists cover_url text check (cover_url is null or cover_url ~ '^(/images/|https://)');
alter table public.places add column if not exists description_kn text not null default '' check (char_length(description_kn) <= 2000);
alter table public.places add column if not exists description_en text not null default '' check (char_length(description_en) <= 2000);
alter table public.places add column if not exists description_hi text not null default '' check (char_length(description_hi) <= 2000);
create index if not exists places_district_order_idx on public.places(sort_order, slug) where is_district;
