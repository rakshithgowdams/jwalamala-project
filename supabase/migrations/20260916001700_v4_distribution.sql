create unique index social_one_account_per_network on public.social_accounts(network);
create table public.newsletter_deliveries(id uuid primary key default gen_random_uuid(),issue_id uuid not null references public.newsletter_issues(id),subscriber_id uuid not null references public.newsletter_subscribers(id),status text not null default 'pending' check(status in ('pending','sent','skipped','failed')),provider_id text,sent_at timestamptz,created_at timestamptz not null default now(),unique(issue_id,subscriber_id));
alter table public.newsletter_deliveries enable row level security;
create policy newsletter_read on public.newsletter_deliveries for select to authenticated using(public.has_permission('newsletter.manage'));
grant select on public.newsletter_deliveries to authenticated;
grant all on public.newsletter_deliveries to service_role;
create function public.queue_v4_distribution(kind text,item_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare state text;
begin
 if kind='newsletter' then
  select status into state from public.newsletter_issues where id=item_id for update;
  if state is distinct from 'draft' then raise exception 'Draft required';end if;
  with deliveries as (insert into public.newsletter_deliveries(issue_id,subscriber_id) select item_id,id from public.newsletter_subscribers where status='active' on conflict do nothing returning id)
  insert into public.automation_jobs(kind,payload) select 'newsletter-delivery',jsonb_build_object('delivery_id',id) from deliveries;
  update public.newsletter_issues set status='queued' where id=item_id;
 elsif kind='social' then
  select status into state from public.social_posts where id=item_id for update;
  if state is distinct from 'draft' then raise exception 'Draft required';end if;
  update public.social_posts set status='queued' where id=item_id;
  insert into public.automation_jobs(kind,payload) values('social-publish',jsonb_build_object('social_id',item_id));
 else raise exception 'Invalid distribution type';end if;
end; $$;
revoke all on function public.queue_v4_distribution(text,uuid) from public,anon,authenticated;
grant execute on function public.queue_v4_distribution(text,uuid) to service_role;
create function public.finalize_v4_newsletters() returns void language sql security definer set search_path='' as $$
 update public.newsletter_issues i set status=case when exists(select 1 from public.newsletter_deliveries d where d.issue_id=i.id and d.status='failed') then 'failed' else 'sent' end,sent_at=now()
 where i.status='queued' and not exists(select 1 from public.newsletter_deliveries d where d.issue_id=i.id and d.status='pending');
$$;
revoke all on function public.finalize_v4_newsletters() from public,anon,authenticated;
grant execute on function public.finalize_v4_newsletters() to service_role;
