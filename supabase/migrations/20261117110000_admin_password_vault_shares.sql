-- Time-limited share links for admin password-vault entries.
-- Token pages are public; only service_role reads rows by token.
-- Creating / revoking shares stays admin-only in the app.

create table if not exists public.admin_password_vault_shares (
  id uuid primary key default gen_random_uuid(),
  vault_id uuid references public.admin_password_vault(id) on delete set null,
  token text not null unique
    check (char_length(token) >= 32 and char_length(token) <= 128),
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
  expires_at timestamptz not null,
  revoked_at timestamptz,
  view_count integer not null default 0 check (view_count >= 0),
  last_viewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_password_vault_shares_token_idx
  on public.admin_password_vault_shares (token);

create index if not exists admin_password_vault_shares_vault_idx
  on public.admin_password_vault_shares (vault_id, created_at desc);

alter table public.admin_password_vault_shares enable row level security;

drop policy if exists admin_password_vault_shares_admin_all on public.admin_password_vault_shares;
create policy admin_password_vault_shares_admin_all on public.admin_password_vault_shares
  for all to authenticated
  using ((select public.has_role('admin')))
  with check ((select public.has_role('admin')));

revoke all on public.admin_password_vault_shares from anon, authenticated;
grant select, insert, update, delete on public.admin_password_vault_shares to authenticated;
grant all on public.admin_password_vault_shares to service_role;
