alter table public.automation_jobs drop constraint automation_jobs_status_check;
alter table public.automation_jobs add constraint automation_jobs_status_check check(status in ('pending','running','done','failed','cancelled'));
create function public.expire_stalled_jobs() returns void language sql security definer set search_path='' as $$update public.automation_jobs set status='failed',last_error='Worker lease expired; review external delivery before retry.' where status='running' and locked_at<now()-interval '15 minutes';$$;
revoke all on function public.expire_stalled_jobs() from public,anon,authenticated;grant execute on function public.expire_stalled_jobs() to service_role;
create function public.manage_v4_job(target uuid,action text,delivery_checked boolean default false) returns void language plpgsql security definer set search_path='' as $$declare j public.automation_jobs;begin
if not public.has_permission('settings.manage') or action not in ('retry','cancel') then raise exception 'Not permitted';end if;
select * into j from public.automation_jobs where id=target for update;if j.id is null or j.status not in ('pending','failed') then raise exception 'Job is not available';end if;
if action='cancel' then if j.kind='newsletter-delivery' then update public.newsletter_deliveries set status='skipped' where id=(j.payload->>'delivery_id')::uuid and status in ('pending','failed');end if; if j.kind='push-delivery' then update public.push_deliveries set status='skipped' where id=(j.payload->>'delivery_id')::uuid and status in ('pending','failed','sending');end if;
if j.kind='social-publish' then update public.social_posts set status='draft' where id=(j.payload->>'social_id')::uuid and status in ('queued','failed');end if; update public.automation_jobs set status='cancelled' where id=target;return;end if;
if j.status<>'failed' then raise exception 'Only failed jobs may be retried';end if;
if j.kind<>'article-audio' and not delivery_checked then raise exception 'Check external delivery before retry';end if;
if j.kind in ('newsletter-delivery','support-receipt') and j.created_at<now()-interval '20 hours' then raise exception 'Provider idempotency window expired; create a reviewed replacement';end if;
if j.kind='push-delivery' then update public.push_deliveries set status='pending',sent_at=null where id=(j.payload->>'delivery_id')::uuid and status in ('failed','sending');end if;
if j.kind='social-publish' then update public.social_posts set status='queued',error=null where id=(j.payload->>'social_id')::uuid and status='failed';end if;
if j.kind='newsletter-delivery' then update public.newsletter_deliveries set status='pending' where id=(j.payload->>'delivery_id')::uuid and status='failed';update public.newsletter_issues set status='queued' where id=(select issue_id from public.newsletter_deliveries where id=(j.payload->>'delivery_id')::uuid) and status='failed';end if;
update public.automation_jobs set status='pending',attempts=0,locked_at=null,run_after=now(),last_error=null where id=target;
end;$$;revoke all on function public.manage_v4_job(uuid,text,boolean) from public,anon;grant execute on function public.manage_v4_job(uuid,text,boolean) to authenticated;

create policy manager_read on public.automation_jobs for select to authenticated using(public.has_permission('settings.manage'));grant select(id,kind,status,attempts,run_after,last_error,created_at) on public.automation_jobs to authenticated;
