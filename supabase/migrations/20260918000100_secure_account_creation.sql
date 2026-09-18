-- Public signup always creates a reader, including the first account.
-- Assign administrators explicitly with trusted server/database credentials.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, left(coalesce(new.raw_user_meta_data->>'full_name', ''), 100), new.phone, 'reader');
  return new;
end;
$$;

-- Read-only readiness check for trusted setup tooling. Never expose function
-- source or privileged configuration through the public API.
create or replace function public.account_security_ready()
returns boolean language sql stable security definer set search_path = '' as $$
  select position('''reader''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0
    and position('''admin''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) = 0;
$$;
revoke all on function public.account_security_ready() from public, anon, authenticated;
grant execute on function public.account_security_ready() to service_role;
