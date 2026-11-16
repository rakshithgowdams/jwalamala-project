-- Staff can request desk features they do not yet have (e.g. Chat).
-- Administrators review them under Access requests and approve or reject.

create table if not exists public.staff_access_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  section_key text not null
    check (char_length(section_key) >= 1 and char_length(section_key) <= 80),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'rejected', 'cancelled')),
  staff_note text not null default ''
    check (char_length(staff_note) <= 1000),
  admin_note text not null default ''
    check (char_length(admin_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- One open request per staff member per feature.
create unique index if not exists staff_access_requests_active_unique
  on public.staff_access_requests (requester_id, section_key)
  where status = 'requested';

create index if not exists staff_access_requests_status_idx
  on public.staff_access_requests (status, created_at desc);

create index if not exists staff_access_requests_requester_idx
  on public.staff_access_requests (requester_id, created_at desc);

alter table public.staff_access_requests enable row level security;

drop policy if exists staff_access_requests_read on public.staff_access_requests;
create policy staff_access_requests_read on public.staff_access_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or (select public.has_role('admin'))
  );

revoke all on public.staff_access_requests from anon, authenticated;
grant select on public.staff_access_requests to authenticated;
grant all on public.staff_access_requests to service_role;
