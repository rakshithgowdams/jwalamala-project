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
