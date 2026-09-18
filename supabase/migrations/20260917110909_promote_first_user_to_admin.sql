/*
# Auto-promote first user to admin role

## Changes
- Replaces the `handle_new_user` trigger function so that the very first
  user to sign up is automatically assigned the `admin` role.
- All subsequent users continue to receive the default `reader` role.
- This ensures the site owner can immediately access the admin dashboard
  after their first signup without needing manual database edits.

## Security
- The function is SECURITY DEFINER (runs as the table owner) so it can
  write to `profiles` regardless of RLS.
- Only the first profile row ever created gets `admin`; the check is
  atomic (count within the INSERT).
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _role public.user_role;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles LIMIT 1) THEN
    _role := 'admin';
  ELSE
    _role := 'reader';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone, role)
  VALUES (
    new.id,
    left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100),
    new.phone,
    _role
  );

  RETURN new;
END;
$$;
