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
