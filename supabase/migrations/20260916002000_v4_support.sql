create table public.payment_refunds(id text primary key,received_at timestamptz not null default now());
alter table public.payment_refunds enable row level security;grant all on public.payment_refunds to service_role;

create table public.support_checkouts(id uuid primary key,user_id uuid not null references public.profiles(id),tier_id text not null,kind text not null check(kind in ('once','monthly','yearly')),amount int not null check(amount>=100),provider_id text unique,status text not null default 'creating' check(status in ('creating','ready','paid','cancelled','failed')),ad_light boolean not null default false,cancel_at_end boolean not null default false,created_at timestamptz not null default now());
alter table public.support_checkouts enable row level security;
create policy own_read on public.support_checkouts for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.support_checkouts to authenticated;grant all on public.support_checkouts to service_role;
create table public.payments(id text primary key,checkout_id uuid not null references public.support_checkouts(id),user_id uuid not null references public.profiles(id),amount int not null,currency text not null check(currency='INR'),status text not null check(status in ('captured','refunded')),paid_at timestamptz not null,period_end timestamptz,receipt_sent_at timestamptz);
alter table public.payments enable row level security;
create policy own_read on public.payments for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.payments to authenticated;grant all on public.payments to service_role;
create table public.supporters(user_id uuid primary key references public.profiles(id),tier_id text not null,valid_until timestamptz not null,ad_light boolean not null default false,updated_at timestamptz not null default now());
alter table public.supporters enable row level security;
create policy own_read on public.supporters for select to authenticated using(user_id=auth.uid() or public.has_permission('settings.manage'));
grant select on public.supporters to authenticated;grant all on public.supporters to service_role;
create function public.record_support_payment(checkout uuid,payment text,amount_paid int,paid_time timestamptz,period_end timestamptz default null) returns void language plpgsql security definer set search_path='' as $$
declare c public.support_checkouts;inserted text;
begin
 perform pg_advisory_xact_lock(hashtextextended(payment,0));
 if exists(select 1 from public.payment_refunds where id=payment) then return;end if;
 select * into c from public.support_checkouts where id=checkout for update;
 if c.id is null or c.amount<>amount_paid or payment !~ '^pay_[a-zA-Z0-9]+$' then raise exception 'Payment mismatch';end if;
 if c.kind<>'once' and (period_end is null or period_end<=paid_time or period_end>paid_time+interval '370 days') then raise exception 'Invalid membership period';end if;
 insert into public.payments(id,checkout_id,user_id,amount,currency,status,paid_at,period_end) values(payment,c.id,c.user_id,amount_paid,'INR','captured',paid_time,period_end) on conflict(id) do nothing returning id into inserted;
 if inserted is null then return;end if;
 update public.support_checkouts set status=case when status='cancelled' then status else 'paid' end where id=checkout;
 if c.kind<>'once' then insert into public.supporters(user_id,tier_id,valid_until,ad_light) values(c.user_id,c.tier_id,period_end,c.ad_light) on conflict(user_id) do update set tier_id=case when excluded.valid_until>=public.supporters.valid_until then excluded.tier_id else public.supporters.tier_id end,valid_until=greatest(excluded.valid_until,public.supporters.valid_until),ad_light=case when excluded.valid_until>=public.supporters.valid_until then excluded.ad_light else public.supporters.ad_light end,updated_at=now();end if;
 insert into public.automation_jobs(kind,payload) values('support-receipt',jsonb_build_object('payment_id',payment));
end;$$;
revoke all on function public.record_support_payment(uuid,text,int,timestamptz,timestamptz) from public,anon,authenticated;grant execute on function public.record_support_payment(uuid,text,int,timestamptz,timestamptz) to service_role;
create function public.refund_support_payment(payment text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid;expires timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended(payment,0));
 insert into public.payment_refunds(id) values(payment) on conflict do nothing;
 update public.payments set status='refunded' where id=payment returning user_id into uid;
 if uid is null then return;end if;
 select max(period_end) into expires from public.payments where user_id=uid and status='captured';
 update public.supporters set valid_until=coalesce(expires,now()),updated_at=now() where user_id=uid;
end;$$;
revoke all on function public.refund_support_payment(text) from public,anon,authenticated;grant execute on function public.refund_support_payment(text) to service_role;

create unique index one_open_membership on public.support_checkouts(user_id) where kind<>'once' and status in ('creating','ready','paid');
