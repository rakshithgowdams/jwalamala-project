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
