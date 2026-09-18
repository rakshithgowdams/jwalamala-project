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
