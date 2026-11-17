-- Admin-only encrypted credential vault (site link, email, password + favicon).
-- Plaintext passwords are never stored; only AES-GCM ciphertext goes in the DB.
-- Access is administrators only (not grantable to staff).

create table if not exists public.admin_password_vault (
  id uuid primary key default gen_random_uuid(),
  title text not null default ''
    check (char_length(title) <= 160),
  site_url text not null
    check (char_length(site_url) >= 8 and char_length(site_url) <= 2000),
  email text not null default ''
    check (char_length(email) <= 320),
  phone text not null default ''
    check (char_length(phone) <= 40),
  password_encrypted text not null
    check (char_length(password_encrypted) >= 16 and char_length(password_encrypted) <= 4000),
  favicon_url text not null default ''
    check (char_length(favicon_url) <= 2000),
  notes text not null default ''
    check (char_length(notes) <= 1000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_password_vault_created_idx
  on public.admin_password_vault (created_at desc);

alter table public.admin_password_vault enable row level security;

drop policy if exists admin_password_vault_admin_all on public.admin_password_vault;
create policy admin_password_vault_admin_all on public.admin_password_vault
  for all to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));

revoke all on public.admin_password_vault from anon, authenticated;
grant select, insert, update, delete on public.admin_password_vault to authenticated;
grant all on public.admin_password_vault to service_role;
