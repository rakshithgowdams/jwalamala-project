-- Hindi joins Kannada and English. Kannada stays the source of record; empty string means "not translated yet".
alter table public.posts add column if not exists title_hi text not null default '';alter table public.posts add column if not exists summary_hi text not null default '';alter table public.posts add column if not exists body_hi text not null default '';
alter table public.categories add column if not exists name_hi text not null default '';
alter table public.places add column if not exists name_hi text not null default '';
alter table public.tags add column if not exists name_hi text not null default '';
alter table public.events add column if not exists name_hi text not null default '';alter table public.events add column if not exists description_hi text not null default '';
alter table public.trending_items add column if not exists label_hi text not null default '';
alter table public.topics add column if not exists title_hi text not null default '';alter table public.topics add column if not exists intro_hi text not null default '';
alter table public.series add column if not exists title_hi text not null default '';alter table public.series add column if not exists description_hi text not null default '';
alter table public.authors add column if not exists name_hi text not null default '';alter table public.authors add column if not exists role_hi text not null default '';alter table public.authors add column if not exists bio_hi text not null default '';alter table public.authors add column if not exists credentials_hi text not null default '';
alter table public.basadis add column if not exists name_hi text not null default '';alter table public.basadis add column if not exists deity_hi text not null default '';alter table public.basadis add column if not exists history_hi text not null default '';alter table public.basadis add column if not exists timings_hi text not null default '';
alter table public.notices add column if not exists title_hi text not null default '';alter table public.notices add column if not exists body_hi text not null default '';
alter table public.opportunities add column if not exists title_hi text not null default '';alter table public.opportunities add column if not exists description_hi text not null default '';
alter table public.web_stories add column if not exists title_hi text not null default '';
alter table public.galleries add column if not exists title_hi text not null default '';alter table public.galleries add column if not exists description_hi text not null default '';
alter table public.quizzes add column if not exists title_hi text not null default '';
alter table public.polls add column if not exists question_hi text not null default '';alter table public.polls add column if not exists options_hi jsonb not null default '[]'::jsonb;
alter table public.jain_calendar_days add column if not exists title_hi text not null default '';alter table public.jain_calendar_days add column if not exists description_hi text not null default '';
alter table public.reservoir_readings add column if not exists name_hi text not null default '';
alter table public.corrections_log add column if not exists note_hi text not null default '';
alter table public.key_points add column if not exists label_hi text not null default '';
alter table public.liveblogs add column if not exists title_hi text not null default '';alter table public.liveblogs add column if not exists summary_hi text not null default '';
alter table public.ads add column if not exists alt_hi text not null default '';
create or replace function public.save_editor_post_chapters(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare pid uuid;point jsonb;position integer:=0;begin pid:=public.save_editor_post_media(payload);if payload ? 'key_points' then if jsonb_typeof(payload->'key_points')<>'array' or jsonb_array_length(payload->'key_points')>100 then raise exception 'Invalid chapters';end if;delete from public.key_points where post_id=pid;for point in select value from jsonb_array_elements(payload->'key_points') loop if (point->>'seconds')::int not between 0 and 172800 or char_length(point->>'label_kn') not between 1 and 300 or char_length(coalesce(point->>'label_hi',''))>300 then raise exception 'Invalid chapter';end if;insert into public.key_points(post_id,seconds,label_kn,label_hi,sort_order) values(pid,(point->>'seconds')::int,point->>'label_kn',coalesce(point->>'label_hi',''),position);position:=position+1;end loop;end if;return pid;end;$$;
create or replace function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare target uuid;begin target:=public.save_editor_post_chapters(payload);if char_length(coalesce(payload->>'body_en',''))>200000 or char_length(coalesce(payload->>'summary_en',''))>1000 or char_length(coalesce(payload->>'body_hi',''))>200000 or char_length(coalesce(payload->>'summary_hi',''))>1000 or char_length(coalesce(payload->>'title_hi',''))>300 then raise exception 'Translation too long';end if;update public.posts set body_en=coalesce(payload->>'body_en',''),summary_en=coalesce(payload->>'summary_en',''),title_hi=coalesce(payload->>'title_hi',''),summary_hi=coalesce(payload->>'summary_hi',''),body_hi=coalesce(payload->>'body_hi','') where id=target;return target;end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;grant execute on function public.save_editor_post(jsonb) to authenticated;
create or replace function public.sponsor_content_hash(p jsonb) returns text language sql immutable set search_path='' as $$select encode(sha256(convert_to(jsonb_build_object('title_kn',p->>'title_kn','body_html',p->>'body_html','summary_kn',p->>'summary_kn','thumbnail_url',p->>'thumbnail_url','image_credit',p->>'image_credit','sponsor_name',p->>'sponsor_name','media_images',coalesce(p->'media_images','[]'::jsonb),'summary_points',coalesce(p->'summary_points','[]'::jsonb),'title_en',p->>'title_en','summary_en',coalesce(p->>'summary_en',''),'body_en',coalesce(p->>'body_en',''),'title_hi',coalesce(p->>'title_hi',''),'summary_hi',coalesce(p->>'summary_hi',''),'body_hi',coalesce(p->>'body_hi',''),'video_url',p->>'video_url','transcript',p->>'transcript')::text,'UTF8')),'hex');$$;
create or replace function public.list_public_posts(filters jsonb default '{}',page_size integer default 12,page_offset integer default 0) returns table(post jsonb,total_count bigint) language sql stable security invoker set search_path='' as $$
select (to_jsonb(p)-'body_html'-'body_json'-'transcript'-'body_en'-'body_hi')||jsonb_build_object('body_html','','category_slugs',coalesce((select jsonb_agg(c.slug) from public.post_categories pc join public.categories c on c.id=pc.category_id where pc.post_id=p.id),'[]'::jsonb),'tags',coalesce((select jsonb_agg(jsonb_build_object('slug',t.slug,'name_kn',t.name_kn,'name_hi',t.name_hi)) from public.post_tags pt join public.tags t on t.id=pt.tag_id where pt.post_id=p.id),'[]'::jsonb)),count(*) over()
from public.posts p where p.status='published' and p.published_at<=now()
and (coalesce(filters->>'mode','')='event_date' or coalesce(jsonb_array_length(filters->'terms'),0)=0 or exists(select 1 from jsonb_array_elements_text(filters->'terms') term where position(lower(term) in lower(p.title_kn||' '||coalesce(p.title_en,'')||' '||coalesce(p.title_hi,'')||' '||coalesce(p.title_translit,'')||' '||coalesce(p.summary_kn,'')||' '||coalesce(p.summary_hi,'')||' '||coalesce(p.event_place,'')))>0))
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
