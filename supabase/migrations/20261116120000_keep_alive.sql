-- A scheduled GitHub Action calls keep_alive_ping() every two days so the free
-- Supabase project never pauses for inactivity. Only admins can read the row.
BEGIN;
create table if not exists public.keep_alive (
  id int primary key,
  last_ping timestamptz,
  ping_count bigint not null default 0
);
insert into public.keep_alive (id) values (1) on conflict (id) do nothing;

alter table public.keep_alive enable row level security;
revoke insert, update, delete, truncate on public.keep_alive from anon, authenticated;
drop policy if exists keep_alive_admin_read on public.keep_alive;
create policy keep_alive_admin_read on public.keep_alive
  for select to authenticated using (public.has_role('admin'));

create or replace function public.keep_alive_ping() returns timestamptz
language sql security definer set search_path = public as $$
  update public.keep_alive
     set last_ping = now(), ping_count = ping_count + 1
   where id = 1
  returning last_ping;
$$;
revoke all on function public.keep_alive_ping() from public;
grant execute on function public.keep_alive_ping() to anon;
COMMIT;
