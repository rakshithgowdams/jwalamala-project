-- Staff accounts created by an administrator in Admin > Staff & access.
-- Each staff member gets their own set of sidebar features; the matching
-- permissions live in user_permissions, which only the server can write, and
-- has_permission() checks them, so every existing RLS policy and server
-- action enforces staff access without further changes.

alter type public.user_role add value if not exists 'staff';

alter table public.profiles
  add column if not exists designation text
    check (designation is null or char_length(designation) <= 80),
  add column if not exists admin_sections text[];

create table if not exists public.user_permissions (
  user_id uuid not null references public.profiles(id) on delete cascade,
  permission text not null check (char_length(permission) <= 60),
  created_at timestamptz not null default now(),
  primary key (user_id, permission)
);
alter table public.user_permissions enable row level security;
drop policy if exists user_permissions_read on public.user_permissions;
create policy user_permissions_read on public.user_permissions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));
revoke all on public.user_permissions from anon, authenticated;
grant select on public.user_permissions to authenticated;
grant all on public.user_permissions to service_role;

-- Unchanged for every existing role; staff are checked against their own grants.
-- role is compared as text so this runs in the same transaction that adds 'staff'.
create or replace function public.has_permission(requested text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.profiles p
     where p.id = auth.uid()
       and (
         p.role = 'admin'
         or (p.role::text = 'staff' and exists(
               select 1 from public.user_permissions up
                where up.user_id = p.id and up.permission = requested))
         or (p.role::text <> 'staff'
             and exists(select 1 from public.role_permissions rp
                         where rp.role = p.role::text and rp.permission = requested and rp.allowed)
             and (p.role <> 'contributor'
                  or (requested in ('admin.access', 'content.create')
                      and exists(select 1 from public.contributor_applications c
                                   join auth.users u on u.id = c.user_id
                                  where c.user_id = p.id and c.status = 'approved'
                                    and u.phone_confirmed_at is not null))))
       )
  );
$$;

-- Staff cannot change their own designation or sidebar access through the API.
create or replace function public.protect_staff_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.designation is distinct from old.designation
      or new.admin_sections is distinct from old.admin_sections)
     and (select auth.role()) <> 'service_role'
     and not public.has_role('admin') then
    raise exception 'Only administrators can change staff access';
  end if;
  return new;
end;
$$;
drop trigger if exists protect_staff_fields on public.profiles;
create trigger protect_staff_fields before update on public.profiles
  for each row execute function public.protect_staff_fields();
