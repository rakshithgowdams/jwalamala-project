-- Article editing tasks: an administrator assigns one or many posts to staff.
-- Staff accounts may edit a post only while they hold an open task for it.
-- Bulk ranges are applied in the app by ordered position (1..N), not by uuid.

create table if not exists public.article_tasks (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  assignee_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'open'
    check (status in ('open', 'done', 'cancelled')),
  batch_label text not null default ''
    check (char_length(batch_label) <= 120),
  notes text not null default ''
    check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists article_tasks_open_unique
  on public.article_tasks (post_id, assignee_id)
  where status = 'open';

create index if not exists article_tasks_assignee_open_idx
  on public.article_tasks (assignee_id, created_at desc)
  where status = 'open';

create index if not exists article_tasks_post_idx
  on public.article_tasks (post_id);

create index if not exists article_tasks_batch_idx
  on public.article_tasks (batch_label)
  where batch_label <> '';

alter table public.article_tasks enable row level security;

drop policy if exists article_tasks_read on public.article_tasks;
create policy article_tasks_read on public.article_tasks
  for select to authenticated
  using (
    assignee_id = (select auth.uid())
    or (select public.has_role('admin'))
  );

revoke all on public.article_tasks from anon, authenticated;
grant select on public.article_tasks to authenticated;
grant all on public.article_tasks to service_role;

-- Staff may edit a post only when they have an open task for it.
-- Every other role keeps the previous content.edit / own-draft rules.
create or replace function public.can_edit_post(pid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.posts p
     where p.id = pid
       and (
         (
           public.has_permission('content.edit')
           and (
             not exists(
               select 1 from public.profiles pr
                where pr.id = auth.uid() and pr.role::text = 'staff'
             )
             or exists(
               select 1 from public.article_tasks t
                where t.post_id = p.id
                  and t.assignee_id = auth.uid()
                  and t.status = 'open'
             )
           )
         )
         or (
           public.has_permission('content.create')
           and p.author_id = auth.uid()
           and p.status = 'draft'
         )
       )
  );
$$;
