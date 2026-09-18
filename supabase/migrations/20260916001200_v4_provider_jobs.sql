create table public.ai_suggestion_acceptances(
 suggestion_id uuid not null references public.ai_suggestions(id) on delete cascade,item_index int not null check(item_index between 0 and 19),user_id uuid not null references public.profiles(id),created_at timestamptz not null default now(),primary key(suggestion_id,item_index)
);
alter table public.ai_suggestion_acceptances enable row level security;
create policy own_read on public.ai_suggestion_acceptances for select to authenticated using(user_id=auth.uid());
grant select on public.ai_suggestion_acceptances to authenticated;
grant all on public.ai_suggestion_acceptances to service_role;
create function public.save_weather_snapshot(weather jsonb,air jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if weather->>'place_id' is distinct from air->>'place_id' then raise exception 'Place mismatch';end if;
 insert into public.weather_snapshots(place_id,fetched_at,current,hourly,daily,provider) values((weather->>'place_id')::uuid,(weather->>'fetched_at')::timestamptz,weather->'current',weather->'hourly',weather->'daily',weather->>'provider')
 on conflict(place_id) do update set fetched_at=excluded.fetched_at,current=excluded.current,hourly=excluded.hourly,daily=excluded.daily,provider=excluded.provider;
 insert into public.aqi_snapshots(place_id,fetched_at,pollutants,naqi,provider) values((air->>'place_id')::uuid,(air->>'fetched_at')::timestamptz,air->'pollutants',(air->>'naqi')::integer,air->>'provider')
 on conflict(place_id) do update set fetched_at=excluded.fetched_at,pollutants=excluded.pollutants,naqi=excluded.naqi,provider=excluded.provider;
end; $$;
revoke all on function public.save_weather_snapshot(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.save_weather_snapshot(jsonb,jsonb) to service_role;
create function public.claim_v4_jobs(batch_size integer default 5) returns setof public.automation_jobs language sql security definer set search_path='' as $$
 update public.automation_jobs set status='running',locked_at=now(),attempts=attempts+1 where id in (
 select id from public.automation_jobs where status='pending' and run_after<=now() and attempts<3 order by run_after for update skip locked limit least(greatest(batch_size,1),10)
 ) returning *;
$$;
revoke all on function public.claim_v4_jobs(integer) from public,anon,authenticated;
grant execute on function public.claim_v4_jobs(integer) to service_role;
