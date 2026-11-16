-- Staff desk chat: groups, membership, text/URL messages only (no media).
-- Run in the Supabase SQL Editor for project aukaaveugptginqbpwwb.

create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 240),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_room_members (
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_label text check (sender_label is null or char_length(sender_label) <= 80),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  kind text not null default 'text' check (kind in ('text', 'url', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists chat_room_members_user_idx on public.chat_room_members (user_id);
create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room_id, created_at desc);

alter table public.chat_rooms enable row level security;
alter table public.chat_room_members enable row level security;
alter table public.chat_messages enable row level security;

create or replace function public.is_chat_member(target_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.has_role('admin')
     or exists (
          select 1 from public.chat_room_members m
           where m.room_id = target_room and m.user_id = auth.uid()
        );
$$;

drop policy if exists chat_rooms_select on public.chat_rooms;
create policy chat_rooms_select on public.chat_rooms
  for select to authenticated
  using (public.is_chat_member(id));

drop policy if exists chat_rooms_admin_write on public.chat_rooms;
create policy chat_rooms_admin_write on public.chat_rooms
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists chat_members_select on public.chat_room_members;
create policy chat_members_select on public.chat_room_members
  for select to authenticated
  using (public.is_chat_member(room_id));

drop policy if exists chat_members_admin_write on public.chat_room_members;
create policy chat_members_admin_write on public.chat_room_members
  for all to authenticated
  using (public.has_role('admin'))
  with check (public.has_role('admin'));

drop policy if exists chat_messages_select on public.chat_messages;
create policy chat_messages_select on public.chat_messages
  for select to authenticated
  using (public.is_chat_member(room_id));

drop policy if exists chat_messages_insert on public.chat_messages;
create policy chat_messages_insert on public.chat_messages
  for insert to authenticated
  with check (
    public.is_chat_member(room_id)
    and (sender_id is null or sender_id = auth.uid())
    and kind in ('text', 'url', 'system')
  );

revoke all on public.chat_rooms from anon, authenticated;
revoke all on public.chat_room_members from anon, authenticated;
revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_rooms to authenticated;
grant select on public.chat_room_members to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_rooms to service_role;
grant all on public.chat_room_members to service_role;
grant all on public.chat_messages to service_role;
