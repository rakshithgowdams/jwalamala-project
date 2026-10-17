-- Local shop and store ads (/local-shops): businesses apply through /advertise, staff review them against the published rules, record the offline payment, then publish.
-- Applicant contact details and billing never leave staff reach: readers only see list_business_ads(), which returns the public face of live ads.
create table public.business_ads(
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9-]{1,150}$'),
 name_kn text not null check (char_length(trim(name_kn)) between 1 and 150),
 name_en text not null default '' check (char_length(name_en) <= 150),
 name_hi text not null default '' check (char_length(name_hi) <= 150),
 category text not null default 'other' check (category in ('jewellery','textiles','sweets','grocery','restaurant','health','education','services','electronics','travel','real_estate','other')),
 offer_kn text not null default '' check (char_length(offer_kn) <= 160),
 offer_en text not null default '' check (char_length(offer_en) <= 160),
 offer_hi text not null default '' check (char_length(offer_hi) <= 160),
 image_url text check (image_url is null or image_url ~ '^(/images/|https://)'),
 phone text not null default '' check (phone ~ '^(\+?[0-9][0-9 -]{7,19})?$'),
 whatsapp text not null default '' check (whatsapp ~ '^(\+?[0-9][0-9 -]{7,19})?$'),
 website text check (website is null or website ~ '^https://'),
 address_kn text not null default '' check (char_length(address_kn) <= 300),
 place_id uuid references public.places(id) on delete set null,
 target_places uuid[] not null default '{}',
 starts_at timestamptz,
 ends_at timestamptz,
 status text not null default 'pending' check (status in ('pending','approved','paused','rejected')),
 payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','waived')),
 amount numeric check (amount >= 0),
 payment_ref text not null default '' check (char_length(payment_ref) <= 200),
 priority integer not null default 0,
 weight integer not null default 1 check (weight between 1 and 1000),
 contact_name text not null default '' check (char_length(contact_name) <= 100),
 contact_email text not null default '' check (char_length(contact_email) <= 254),
 contact_phone text not null default '' check (char_length(contact_phone) <= 20),
 requested_formats text[] not null default '{}',
 message text not null default '' check (char_length(message) <= 2000),
 review_note text not null default '' check (char_length(review_note) <= 2000),
 policy_accepted_at timestamptz,
 ip_hash text,
 is_seed boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (ends_at is null or starts_at is null or ends_at > starts_at),
 check (status <> 'approved' or (starts_at is not null and ends_at is not null))
);
create index business_ads_live_idx on public.business_ads(ends_at) where status = 'approved';
create table public.business_ad_stats_daily(
 ad_id uuid not null references public.business_ads(id) on delete cascade,
 day date not null,
 impressions bigint not null default 0,
 clicks bigint not null default 0,
 primary key (ad_id, day)
);
alter table public.business_ads enable row level security;
alter table public.business_ad_stats_daily enable row level security;
create policy staff_manage on public.business_ads for all to authenticated using (public.has_permission('ads.manage')) with check (public.has_permission('ads.manage'));
create policy staff_read on public.business_ad_stats_daily for select to authenticated using (public.has_permission('ads.manage') or public.has_permission('analytics.read'));
grant select, insert, update, delete on public.business_ads to authenticated;
grant select on public.business_ad_stats_daily to authenticated;
grant all on public.business_ads, public.business_ad_stats_daily to service_role;
create trigger audit_changes after insert or update or delete on public.business_ads for each row execute function public.audit_content();
create trigger touch_update before update on public.business_ads for each row execute function public.touch_updated_at();
create function public.list_business_ads() returns table(id uuid, slug text, name_kn text, name_en text, name_hi text, category text, offer_kn text, offer_en text, offer_hi text, image_url text, phone text, whatsapp text, website text, address_kn text, place_id uuid, target_places uuid[], ends_at timestamptz, priority integer, weight integer) language sql stable security definer set search_path = '' as $$
 select a.id, a.slug, a.name_kn, a.name_en, a.name_hi, a.category, a.offer_kn, a.offer_en, a.offer_hi, a.image_url, a.phone, a.whatsapp, a.website, a.address_kn, a.place_id, a.target_places, a.ends_at, a.priority, a.weight
 from public.business_ads a
 where a.status = 'approved' and a.payment_status <> 'unpaid' and a.starts_at <= now() and a.ends_at > now()
 order by a.priority desc, a.created_at
 limit 500;
$$;
revoke all on function public.list_business_ads() from public;
grant execute on function public.list_business_ads() to anon, authenticated;
create function public.record_business_ad_event(ad uuid, session text, kind text) returns void language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Kolkata')::date;
begin
 if kind not in ('click', 'impression') then return; end if;
 if not public.v4_rate_limit('business-ad:' || ad::text || ':' || session || ':' || kind, 1, case when kind = 'click' then 30 else 60 end) then return; end if;
 if not exists (select 1 from public.business_ads a where a.id = ad and a.status = 'approved' and a.payment_status <> 'unpaid' and a.starts_at <= now() and a.ends_at > now()) then return; end if;
 insert into public.business_ad_stats_daily(ad_id, day, impressions, clicks) values (ad, today, case when kind = 'impression' then 1 else 0 end, case when kind = 'click' then 1 else 0 end)
 on conflict on constraint business_ad_stats_daily_pkey do update set impressions = public.business_ad_stats_daily.impressions + excluded.impressions, clicks = public.business_ad_stats_daily.clicks + excluded.clicks;
end; $$;
revoke all on function public.record_business_ad_event(uuid, text, text) from public, anon, authenticated;
grant execute on function public.record_business_ad_event(uuid, text, text) to service_role;
-- District pages get their own Google/direct slots so they can be sold and tuned apart from category pages.
insert into public.ad_slots(slot_key) values ('district_top'), ('district_sidebar'), ('district_bottom') on conflict (slot_key) do nothing;
