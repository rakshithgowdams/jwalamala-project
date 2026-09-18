
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
