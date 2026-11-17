-- Add phone number to vault entries and share snapshots.

alter table public.admin_password_vault
  add column if not exists phone text not null default '';

alter table public.admin_password_vault_shares
  add column if not exists phone text not null default '';

-- Refresh PostgREST so API selects of `phone` work immediately.
notify pgrst, 'reload schema';
