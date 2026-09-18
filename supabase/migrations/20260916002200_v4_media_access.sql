
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
