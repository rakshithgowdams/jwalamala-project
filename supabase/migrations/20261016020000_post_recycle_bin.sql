-- Soft-delete. The article stays in the database until an administrator
-- removes it from the recycle bin.
alter table public.posts add column if not exists deleted_at timestamptz;
create index if not exists posts_recycle_bin on public.posts (deleted_at desc) where deleted_at is not null;

-- Moving an article to the bin must not re-run the publication checklist.
create or replace function public.v4_post_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare content_changed boolean:=true;
begin
 if tg_op='UPDATE' then
 content_changed:=(to_jsonb(new)-array['locked_by','locked_at','updated_at','search_vector','deleted_at']) is distinct from (to_jsonb(old)-array['locked_by','locked_at','updated_at','search_vector','deleted_at']);
 if old.locked_by is not null and old.locked_by<>auth.uid() and old.locked_at>now()-interval '15 minutes' and auth.role()<>'service_role' then
  if not (public.has_role('admin') and not content_changed and new.locked_by=auth.uid()) then raise exception 'Post is locked by another editor';end if;
 end if;
 end if;
 if content_changed and new.status in ('published','scheduled') then
  if auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
  if new.embargo_until is not null and ((new.status='published' and new.embargo_until>now()) or (new.status='scheduled' and new.scheduled_for<new.embargo_until)) then raise exception 'Embargo has not ended';end if;
  if nullif(trim(new.summary_kn),'') is null or new.event_date is null or nullif(trim(new.image_credit),'') is null or char_length(new.title_kn)>110 then raise exception 'Publication checklist incomplete';end if;
 end if;
 if tg_op='UPDATE' and (new.body_html is distinct from old.body_html or new.title_kn is distinct from old.title_kn) then insert into public.post_versions(post_id,author_id,snapshot) values(old.id,auth.uid(),to_jsonb(old)-'search_vector');end if;
 return new;
end;$$;

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using(
  (status='published' and published_at<=now() and deleted_at is null and (embargo_until is null or embargo_until<=now()))
  or public.has_permission('content.read')
  or (author_id=auth.uid() and public.has_permission('content.create'))
);
