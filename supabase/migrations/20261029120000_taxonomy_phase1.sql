-- Phase 1 taxonomy (reversible). No article rows are moved.
-- Reverse: drop post_mathas, drop mathas, delete the three new category slugs,
-- drop categories.category_kind, restore list_public_posts from v6.

alter table public.categories
  add column if not exists category_kind text not null default 'listing';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'categories_category_kind_check'
  ) then
    alter table public.categories
      add constraint categories_category_kind_check
      check (category_kind in ('news','kshetra','programme','listing','upcoming'));
  end if;
end $$;

update public.categories set category_kind = 'news'
where slug in (
  'news','state-jain-news','jain-milan','other-state-news','panchakalyana',
  'mahamastakabhisheka','weekly-jain-news','jain-matha'
);
update public.categories set category_kind = 'programme'
where slug in (
  'jwalamala-programmes','sadhakara-hejje','hemmeya-shravakaru','jnana-deepike',
  'jnana-deevige','dharmada-nudi','jain-habbagalu','jain-jeevana-shaili',
  'chintana-manthana'
);
update public.categories set category_kind = 'kshetra'
where slug in ('basadi');

-- Missing programme categories. facebook_articles is a source facet (Phase 5), not a category.
insert into public.categories(
  id,slug,name_kn,name_en,name_hi,sort_order,parent_id,category_kind,show_in_menu,is_seed
) values
(
  '00000000-0000-4000-8000-000000000030',
  'kiru-parichaya',
  'ಕಿರು ಪರಿಚಯ / ವ್ಯಕ್ತಿ ಪರಿಚಯ',
  'Short profiles',
  'संक्षिप्त परिचय',
  119,
  '00000000-0000-4000-8000-000000000020',
  'programme',
  true,
  false
),
(
  '00000000-0000-4000-8000-000000000031',
  'sahitigalondige-samvada',
  'ಸಾಹಿತಿಗಳೊಂದಿಗೆ ಸಂವಾದ',
  'Conversations with writers',
  'साहित्यकारों से संवाद',
  111,
  '00000000-0000-4000-8000-000000000020',
  'programme',
  true,
  false
),
(
  '00000000-0000-4000-8000-000000000032',
  'kshetra-parichaya',
  'ಜಿಲ್ಲಾವಾರು ಜೈನ ಕ್ಷೇತ್ರ ಪರಿಚಯ',
  'Kshetra introductions by district',
  'ज़िलेवार जैन क्षेत्र परिचय',
  103,
  null,
  'kshetra',
  false,
  false
)
on conflict (slug) do update set
  name_kn = excluded.name_kn,
  name_en = excluded.name_en,
  name_hi = excluded.name_hi,
  parent_id = excluded.parent_id,
  category_kind = excluded.category_kind,
  show_in_menu = excluded.show_in_menu;

create table if not exists public.mathas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_kn text not null,
  name_en text not null default '',
  name_hi text not null default '',
  district_id uuid references public.places(id),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.mathas enable row level security;

create table if not exists public.post_mathas (
  post_id uuid not null references public.posts(id) on delete cascade,
  matha_id uuid not null references public.mathas(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, matha_id)
);
alter table public.post_mathas enable row level security;

create index if not exists mathas_menu_idx on public.mathas (is_active, sort_order, slug);
create index if not exists post_mathas_matha_idx on public.post_mathas (matha_id);

drop policy if exists mathas_read on public.mathas;
create policy mathas_read on public.mathas
  for select using (is_active or public.is_staff());
drop policy if exists mathas_insert on public.mathas;
create policy mathas_insert on public.mathas
  for insert to authenticated
  with check (public.has_permission('content.edit'));
drop policy if exists mathas_update on public.mathas;
create policy mathas_update on public.mathas
  for update to authenticated
  using (public.has_permission('content.edit'))
  with check (public.has_permission('content.edit'));
drop policy if exists mathas_delete on public.mathas;
create policy mathas_delete on public.mathas
  for delete to authenticated
  using (public.has_role('admin'));

drop policy if exists post_mathas_read on public.post_mathas;
create policy post_mathas_read on public.post_mathas
  for select using (exists (select 1 from public.posts p where p.id = post_id));
drop policy if exists post_mathas_insert on public.post_mathas;
create policy post_mathas_insert on public.post_mathas
  for insert to authenticated
  with check (public.can_edit_post(post_id));
drop policy if exists post_mathas_update on public.post_mathas;
create policy post_mathas_update on public.post_mathas
  for update to authenticated
  using (public.can_edit_post(post_id))
  with check (public.can_edit_post(post_id));
drop policy if exists post_mathas_delete on public.post_mathas;
create policy post_mathas_delete on public.post_mathas
  for delete to authenticated
  using (public.has_role('admin') or public.can_edit_post(post_id));

grant select on public.mathas, public.post_mathas to anon;
grant select, insert, update, delete on public.mathas, public.post_mathas to authenticated;

drop trigger if exists touch_update on public.mathas;
create trigger touch_update before update on public.mathas
  for each row execute function public.touch_updated_at();
drop trigger if exists audit_changes on public.mathas;
create trigger audit_changes after insert or update or delete on public.mathas
  for each row execute function public.audit_content();
drop trigger if exists audit_changes on public.post_mathas;
create trigger audit_changes after insert or update or delete on public.post_mathas
  for each row execute function public.audit_content();

-- Three named mathas from the 29 Oct review. Remaining four stay admin-editable.
insert into public.mathas (id, slug, name_kn, name_en, name_hi, sort_order, is_active)
values
(
  '00000000-0000-4000-8000-000000000101',
  'shravanabelagola-matha',
  'ಶ್ರೀ ಕ್ಷೇತ್ರ ಶ್ರವಣಬೆಳಗೊಳ ದಿಗಂಬರ ಜೈನ ಮಠ',
  'Shri Kshetra Shravanabelagola Digambar Jain Math',
  'श्री क्षेत्र श्रवणबेलगोला दिगंबर जैन मठ',
  10,
  true
),
(
  '00000000-0000-4000-8000-000000000102',
  'hombuja-matha',
  'ಹೊಂಬುಜ ದಿಗಂಬರ ಜೈನ ಮಹಾ ಸಂಸ್ಥಾನ ಮಠ',
  'Hombuja Digambar Jain Maha Sansthan Math',
  'होम्बुज दिगंबर जैन महा संस्थान मठ',
  20,
  true
),
(
  '00000000-0000-4000-8000-000000000103',
  'swadi-matha',
  'ಸ್ವಾದಿ ದಿಗಂಬರ ಜೈನ ಮಠ',
  'Swadi Digambar Jain Math',
  'स्वादि दिगंबर जैन मठ',
  30,
  true
)
on conflict (slug) do update set
  name_kn = excluded.name_kn,
  name_en = excluded.name_en,
  name_hi = excluded.name_hi,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

create or replace function public.list_public_posts(
  filters jsonb default '{}',
  page_size integer default 12,
  page_offset integer default 0
) returns table(post jsonb, total_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
select (to_jsonb(p)-'body_html'-'body_json'-'transcript'-'body_en'-'body_hi')||jsonb_build_object(
  'body_html','',
  'category_slugs', coalesce((
    select jsonb_agg(c.slug) from public.post_categories pc
    join public.categories c on c.id = pc.category_id
    where pc.post_id = p.id
  ), '[]'::jsonb),
  'tags', coalesce((
    select jsonb_agg(jsonb_build_object(
      'slug', t.slug, 'name_kn', t.name_kn, 'name_en', t.name_en, 'name_hi', t.name_hi
    ))
    from public.post_tags pt join public.tags t on t.id = pt.tag_id
    where pt.post_id = p.id
  ), '[]'::jsonb)
), count(*) over()
from public.posts p
where p.status = 'published' and p.published_at <= now()
and (
  coalesce(filters->>'mode','') = 'event_date'
  or coalesce(jsonb_array_length(filters->'terms'), 0) = 0
  or exists (
    select 1 from jsonb_array_elements_text(filters->'terms') term
    where position(lower(term) in lower(
      p.title_kn||' '||coalesce(p.title_en,'')||' '||coalesce(p.title_hi,'')||' '||
      coalesce(p.title_translit,'')||' '||coalesce(p.summary_kn,'')||' '||
      coalesce(p.summary_en,'')||' '||coalesce(p.summary_hi,'')||' '||coalesce(p.event_place,'')
    )) > 0
  )
)
and (nullif(filters->>'from','') is null or p.event_date >= (filters->>'from')::date)
and (nullif(filters->>'to','') is null or p.event_date <= (filters->>'to')::date)
and (nullif(filters->>'year','') is null or extract(year from p.event_date)::text = filters->>'year')
and (nullif(filters->>'place','') is null or p.event_place = filters->>'place')
and (
  (nullif(filters->>'state','') is null and nullif(filters->>'district','') is null and nullif(filters->>'city','') is null)
  or exists (
    select 1 from public.places geo
    where (
      geo.id = p.place_id
      or (p.place_id is null and lower(trim(p.event_place)) in (lower(geo.name_kn), lower(geo.name_en), lower(geo.slug)))
    )
    and (nullif(filters->>'state','') is null or geo.state = filters->>'state')
    and (nullif(filters->>'district','') is null or geo.district = filters->>'district')
    and (nullif(filters->>'city','') is null or (not geo.is_district and geo.slug = filters->>'city'))
  )
)
and (nullif(filters->>'type','') is null or p.type::text = filters->>'type')
and (
  nullif(filters->>'category','') is null
  or exists (
    select 1 from public.post_categories pc
    join public.categories c on c.id = pc.category_id
    where pc.post_id = p.id and c.slug = filters->>'category'
  )
)
and (
  nullif(filters->>'tag','') is null
  or exists (
    select 1 from public.post_tags pt
    join public.tags t on t.id = pt.tag_id
    where pt.post_id = p.id and t.slug = filters->>'tag'
  )
)
and (
  nullif(filters->>'author','') is null
  or exists (
    select 1 from public.authors a
    where a.id = p.public_author_id and a.slug = filters->>'author'
  )
)
and (
  nullif(filters->>'place_id','') is null
  or p.place_id = (filters->>'place_id')::uuid
  or p.event_place = (select name_kn from public.places where id = (filters->>'place_id')::uuid)
)
and (coalesce(filters->>'media','') <> 'true' or p.type in ('video','short'))
and (coalesce(filters->>'live','') <> 'true' or p.is_live)
and (
  nullif(filters->>'series','') is null
  or exists (
    select 1 from public.series_items si
    join public.series s on s.id = si.series_id
    where si.post_id = p.id and s.slug = filters->>'series' and s.is_active
  )
)
and (
  nullif(filters->>'topic','') is null
  or exists (
    select 1 from public.topics t
    where t.slug = filters->>'topic' and t.is_active
    and (
      exists (select 1 from public.topic_pins tp where tp.topic_id = t.id and tp.post_id = p.id)
      or exists (select 1 from public.post_tags pt where pt.post_id = p.id and pt.tag_id = any(t.tag_ids))
    )
  )
)
and (
  nullif(filters->>'matha','') is null
  or exists (
    select 1 from public.post_mathas pm
    join public.mathas m on m.id = pm.matha_id
    where pm.post_id = p.id and m.slug = filters->>'matha' and m.is_active
  )
)
order by
  (select tp.sort_order from public.topic_pins tp
    join public.topics t on t.id = tp.topic_id
    where tp.post_id = p.id and t.slug = filters->>'topic' limit 1) asc nulls last,
  (select si.episode_no from public.series_items si
    join public.series s on s.id = si.series_id
    where si.post_id = p.id and s.slug = filters->>'series' limit 1) asc,
  case when filters->>'sort' = 'oldest' then p.published_at end asc,
  case when filters->>'sort' = 'event_date' then p.event_date end desc,
  case when filters->>'sort' = 'most_viewed' then p.view_count end desc,
  p.published_at desc,
  p.id
limit greatest(1, least(page_size, 50))
offset greatest(0, least(page_offset, 500000));
$$;

revoke all on function public.list_public_posts(jsonb, integer, integer) from public;
grant execute on function public.list_public_posts(jsonb, integer, integer) to anon, authenticated;
