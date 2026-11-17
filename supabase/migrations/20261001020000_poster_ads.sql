-- Poster ads (/admin/posters): the publisher's own 16:9 banners and 1:1 posters. A poster names the pages it runs on and fills every reserved space of its shape there; its dates switch it on and off.
-- 'any' keeps legacy banners exactly as before: they still need explicit slot keys and are the only creatives the mobile sticky strip accepts.
alter table public.ads add column if not exists shape text not null default 'any' check (shape in ('any', 'landscape', 'square'));
alter table public.ads add constraint ads_poster_target_https check (shape = 'any' or target_url is null or target_url ~ '^https://');
drop function public.pick_manual_ad(text, text, uuid[], uuid, text);
create function public.pick_manual_ad(requested_slot text, page_type text, category_ids uuid[], place_id uuid, device_type text, slot_shape text default 'landscape') returns setof public.ads language sql volatile security definer set search_path = '' as $$
 select a.* from public.ads a left join public.ad_campaigns c on c.id = a.campaign_id
 where a.is_active and a.starts_at <= now() and a.ends_at > now()
 and (a.campaign_id is null or (c.is_active and c.starts_at <= now() and c.ends_at > now()))
 and (requested_slot = any(a.slot_keys) or (a.shape <> 'any' and cardinality(a.slot_keys) = 0))
 and (a.shape = 'any' or a.shape = slot_shape)
 and (a.device = 'all' or a.device = device_type)
 and (cardinality(a.category_ids) = 0 or a.category_ids && pick_manual_ad.category_ids)
 and (cardinality(a.target_places) = 0 or place_id = any(a.target_places))
 and (cardinality(a.target_pages) = 0 or page_type = any(a.target_pages))
 and (a.max_impressions is null or a.impressions < a.max_impressions)
 and (a.max_clicks is null or a.clicks < a.max_clicks)
 and (a.daily_impression_cap is null or (select coalesce(sum(s.impressions), 0) from public.ad_stats_daily s where s.ad_id = a.id and s.day = (now() at time zone 'Asia/Kolkata')::date) < a.daily_impression_cap)
 order by a.priority desc, -ln(greatest(random(), 0.000001)) / a.weight limit 1;
$$;
revoke all on function public.pick_manual_ad(text, text, uuid[], uuid, text, text) from public, anon, authenticated;
grant execute on function public.pick_manual_ad(text, text, uuid[], uuid, text, text) to service_role;
create or replace function public.record_ad_event(ad uuid, slot text, device text, session text, kind text) returns void language plpgsql security definer set search_path = '' as $$
declare row public.ads; today date := (now() at time zone 'Asia/Kolkata')::date; daily_count bigint;
begin
 if kind not in ('click', 'impression') or device not in ('mobile', 'desktop') then return; end if;
 if not public.v4_rate_limit('ad:' || ad::text || ':' || session || ':' || kind, 1, case when kind = 'click' then 30 else 60 end) then return; end if;
 select * into row from public.ads where id = ad for update;
 if not found or not row.is_active or row.starts_at > now() or row.ends_at <= now()
  or not (slot = any(row.slot_keys) or (row.shape <> 'any' and cardinality(row.slot_keys) = 0)) then return; end if;
 if kind = 'impression' then
  select coalesce(sum(impressions), 0) into daily_count from public.ad_stats_daily where ad_id = ad and day = today;
  if (row.max_impressions is not null and row.impressions >= row.max_impressions) or (row.daily_impression_cap is not null and daily_count >= row.daily_impression_cap) then return; end if;
  update public.ads set impressions = impressions + 1 where id = ad;
 else update public.ads set clicks = clicks + 1 where id = ad; end if;
 insert into public.ad_stats_daily(ad_id, slot_key, day, device, impressions, clicks) values (ad, slot, today, device, case when kind = 'impression' then 1 else 0 end, case when kind = 'click' then 1 else 0 end)
 on conflict on constraint ad_stats_daily_pkey do update set impressions = public.ad_stats_daily.impressions + excluded.impressions, clicks = public.ad_stats_daily.clicks + excluded.clicks;
end; $$;
