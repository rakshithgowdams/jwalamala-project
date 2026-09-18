alter table public.story_assignments drop constraint story_assignments_status_check;
alter table public.story_assignments add constraint story_assignments_status_check check(status in ('idea','assigned','draft','review','changes_requested','approved','scheduled','published','updated','archived'));
create function public.restore_v4_version(version_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare ver public.post_versions;
begin
 select * into ver from public.post_versions where id=version_id;
 if not found or not public.can_edit_post(ver.post_id) then raise exception 'Not permitted';end if;
 -- Restoring never silently republishes, changes URLs or bypasses the post lock.
 update public.posts set title_kn=ver.snapshot->>'title_kn',title_en=ver.snapshot->>'title_en',body_html=ver.snapshot->>'body_html',body_json=ver.snapshot->'body_json',summary_kn=ver.snapshot->>'summary_kn',summary_points=coalesce(ver.snapshot->'summary_points','[]'),image_credit=ver.snapshot->>'image_credit',status='draft',scheduled_for=null where id=ver.post_id;
end; $$;
revoke all on function public.restore_v4_version(uuid) from public,anon;
grant execute on function public.restore_v4_version(uuid) to authenticated;
create function public.v4_assignment_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status in ('approved','scheduled','published','updated') and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
 return new;
end; $$;
create trigger assignment_guard before insert or update on public.story_assignments for each row execute function public.v4_assignment_guard();
