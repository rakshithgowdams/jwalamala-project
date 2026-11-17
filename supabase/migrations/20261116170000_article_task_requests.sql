-- Article task requests: 3-step verification on top of open article_tasks.
-- Staff requests → admin approves with Drive link (processing) or rejects →
-- staff sends ready → admin publishes and marks done.

create table if not exists public.article_task_requests (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.article_tasks(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'ready', 'rejected', 'done', 'cancelled')),
  staff_note text not null default ''
    check (char_length(staff_note) <= 1000),
  admin_note text not null default ''
    check (char_length(admin_note) <= 1000),
  drive_url text not null default ''
    check (char_length(drive_url) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  ready_at timestamptz,
  done_at timestamptz
);

-- Only one active verification request per assignment at a time.
create unique index if not exists article_task_requests_active_task_unique
  on public.article_task_requests (task_id)
  where status in ('requested', 'processing', 'ready');

create index if not exists article_task_requests_requester_idx
  on public.article_task_requests (requester_id, created_at desc);

create index if not exists article_task_requests_status_idx
  on public.article_task_requests (status, created_at desc);

create index if not exists article_task_requests_post_idx
  on public.article_task_requests (post_id);

alter table public.article_task_requests enable row level security;

drop policy if exists article_task_requests_read on public.article_task_requests;
create policy article_task_requests_read on public.article_task_requests
  for select to authenticated
  using (
    requester_id = (select auth.uid())
    or (select public.has_role('admin'))
  );

revoke all on public.article_task_requests from anon, authenticated;
grant select on public.article_task_requests to authenticated;
grant all on public.article_task_requests to service_role;
