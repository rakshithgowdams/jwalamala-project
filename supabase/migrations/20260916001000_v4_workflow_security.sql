-- Dynamic permissions govern both direct REST access and editor RPCs.
create or replace function public.is_staff() returns boolean language sql stable security definer set search_path='' as $$ select public.has_permission('admin.access'); $$;
create or replace function public.can_edit_post(pid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.posts p where p.id=pid and (public.has_permission('content.edit') or (public.has_permission('content.create') and p.author_id=auth.uid() and p.status='draft')));
$$;
drop policy posts_read on public.posts;
create policy posts_read on public.posts for select using((status='published' and published_at<=now() and (embargo_until is null or embargo_until<=now())) or public.has_permission('content.read') or (author_id=auth.uid() and public.has_permission('content.create')));
drop policy posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated with check((public.has_permission('content.edit') or (public.has_permission('content.create') and author_id=auth.uid() and status='draft')) and (status not in ('published','scheduled') or public.has_permission('content.publish')));
drop policy posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated using(public.can_edit_post(id)) with check((public.has_permission('content.edit') or (public.has_permission('content.create') and author_id=auth.uid() and status='draft')) and (status not in ('published','scheduled') or public.has_permission('content.publish')));
do $$ declare tab text;begin
 foreach tab in array array['categories','events','tags'] loop
 execute format('drop policy content_insert on public.%I',tab);
 execute format('drop policy content_update on public.%I',tab);
 execute format('drop policy content_delete on public.%I',tab);
 execute format('create policy editorial_write on public.%I for all to authenticated using(public.has_permission(''content.edit'')) with check(public.has_permission(''content.edit''))',tab);
 end loop;
 foreach tab in array array['import_jobs','import_rows'] loop
 execute format('drop policy editor_write on public.%I',tab);
 execute format('create policy editorial_write on public.%I for all to authenticated using(public.has_permission(''content.edit'')) with check(public.has_permission(''content.edit''))',tab);
 end loop;
end; $$;
drop policy ads_manage on public.ads;
create policy ads_manage on public.ads for all to authenticated using(public.has_permission('ads.manage')) with check(public.has_permission('ads.manage'));
drop policy submissions_read on public.submissions;
drop policy submissions_update on public.submissions;
create policy submissions_read on public.submissions for select to authenticated using(public.has_permission('community.manage'));
create policy submissions_update on public.submissions for update to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
drop policy views_read on public.post_views_daily;
create policy views_read on public.post_views_daily for select to authenticated using(public.has_permission('analytics.read'));

-- Publication guard also runs for direct writes; administrative role alone cannot bypass an embargo.
create function public.v4_post_guard() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and old.locked_by is not null and old.locked_by<>auth.uid() and old.locked_at>now()-interval '15 minutes' and auth.role()<>'service_role' then raise exception 'Post is locked by another editor';end if;
 if new.status in ('published','scheduled') then
  if auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
  if new.embargo_until is not null and ((new.status='published' and new.embargo_until>now()) or (new.status='scheduled' and new.scheduled_for<new.embargo_until)) then raise exception 'Embargo has not ended';end if;
  if nullif(trim(new.summary_kn),'') is null or new.event_date is null or nullif(trim(new.image_credit),'') is null or char_length(new.title_kn)>110 then raise exception 'Publication checklist incomplete';end if;
 end if;
 if tg_op='UPDATE' and (new.body_html is distinct from old.body_html or new.title_kn is distinct from old.title_kn) then
  insert into public.post_versions(post_id,author_id,snapshot) values(old.id,auth.uid(),to_jsonb(old)-'search_vector');
  if new.meaningful_update_at is not distinct from old.meaningful_update_at then new.meaningful_update_at:=old.meaningful_update_at;end if;
 end if;
 return new;
end; $$;
create trigger v4_guard before insert or update on public.posts for each row execute function public.v4_post_guard();
drop policy staff_manage on public.post_versions;
create policy version_read on public.post_versions for select to authenticated using(public.can_edit_post(post_id));
revoke insert,update,delete on public.post_versions from authenticated;

create function public.lock_v4_post(target uuid,release boolean default false,takeover boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare current_post public.posts;
begin
 if not public.can_edit_post(target) then raise exception 'Not permitted';end if;
 select * into current_post from public.posts where id=target for update;
 if release then
  if current_post.locked_by=auth.uid() then update public.posts set locked_by=null,locked_at=null where id=target;return true;end if;return false;
 end if;
 if current_post.locked_by is not null and current_post.locked_by<>auth.uid() and current_post.locked_at>now()-interval '15 minutes' then
  -- Takeover is explicit and limited to administrators; unlock first so the guard can apply.
  if not takeover or not public.has_role('admin') then return false;end if;
  return false;
 end if;
 update public.posts set locked_by=auth.uid(),locked_at=now() where id=target;
 return true;
end; $$;
revoke all on function public.lock_v4_post(uuid,boolean,boolean) from public,anon;
grant execute on function public.lock_v4_post(uuid,boolean,boolean) to authenticated;
create or replace function public.publish_scheduled_posts() returns void language sql security definer set search_path='' as $$
 update public.posts set status='published',published_at=now() where status='scheduled' and scheduled_for<=now() and (embargo_until is null or embargo_until<=now()) and event_date is not null and nullif(trim(summary_kn),'') is not null and nullif(trim(image_credit),'') is not null and char_length(title_kn)<=110;
$$;
create unique index reaction_one_per_user on public.reactions(post_id,user_id) where user_id is not null;
