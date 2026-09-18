-- Every application table is protected. All elevated functions have fixed search_path.
do $$ declare t text;begin foreach t in array array['profiles','categories','events','posts','post_categories','tags','post_tags','key_points','ads','submissions','bookmarks','event_reminders','push_subscriptions','redirects','site_settings','import_jobs','import_rows','post_views_daily','audit_log','rate_limits'] loop execute format('alter table public.%I enable row level security',t);end loop;end; $$;
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or public.is_staff());
create policy profiles_update on public.profiles for update to authenticated using(id=(select auth.uid()) or public.has_role('admin')) with check(id=(select auth.uid()) or public.has_role('admin'));
create policy posts_read on public.posts for select using((status='published' and published_at<=now()) or public.is_staff());
create policy posts_insert on public.posts for insert to authenticated with check(public.has_role('admin') or public.has_role('editor') or(public.has_role('reporter') and author_id=(select auth.uid()) and status='draft'));
create policy posts_update on public.posts for update to authenticated using(public.can_edit_post(id)) with check(public.has_role('admin') or public.has_role('editor') or(public.has_role('reporter') and author_id=(select auth.uid()) and status='draft'));
create policy posts_delete on public.posts for delete to authenticated using(public.has_role('admin'));
do $$ declare t text;begin foreach t in array array['categories','events','tags'] loop
 execute format('create policy content_read on public.%I for select using(true)',t);
 execute format('create policy content_insert on public.%I for insert to authenticated with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 execute format('create policy content_update on public.%I for update to authenticated using(public.has_role(''editor'') or public.has_role(''admin'')) with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 execute format('create policy content_delete on public.%I for delete to authenticated using(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['post_categories','post_tags','key_points'] loop
 execute format('create policy related_read on public.%I for select using(exists(select 1 from public.posts p where p.id=post_id))',t);
 execute format('create policy related_insert on public.%I for insert to authenticated with check(public.can_edit_post(post_id))',t);
 execute format('create policy related_update on public.%I for update to authenticated using(public.can_edit_post(post_id)) with check(public.can_edit_post(post_id))',t);
 execute format('create policy related_delete on public.%I for delete to authenticated using(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['bookmarks','event_reminders','push_subscriptions'] loop
 execute format('create policy own_rows on public.%I for all to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 end loop;
 foreach t in array array['redirects','site_settings'] loop
 execute format('create policy public_read on public.%I for select using(true)',t);
 execute format('create policy admin_write on public.%I for all to authenticated using(public.has_role(''admin'')) with check(public.has_role(''admin''))',t);
 end loop;
 foreach t in array array['import_jobs','import_rows'] loop
 execute format('create policy staff_read on public.%I for select to authenticated using(public.is_staff())',t);
 execute format('create policy editor_write on public.%I for all to authenticated using(public.has_role(''editor'') or public.has_role(''admin'')) with check(public.has_role(''editor'') or public.has_role(''admin''))',t);
 end loop;
 end; $$;
create policy ads_read on public.ads for select using((is_active and starts_at<=now() and ends_at>now()) or public.is_staff());
create policy ads_manage on public.ads for all to authenticated using(public.has_role('editor') or public.has_role('admin')) with check(public.has_role('editor') or public.has_role('admin'));
create policy submissions_read on public.submissions for select to authenticated using(public.is_staff());
create policy submissions_update on public.submissions for update to authenticated using(public.is_staff()) with check(public.is_staff());
create policy views_read on public.post_views_daily for select to authenticated using(public.is_staff());
create policy audit_read on public.audit_log for select to authenticated using(public.is_staff());
-- No client write policies for audit_log, rate_limits, post_views_daily, or submissions INSERT.
grant select on public.categories,public.events,public.tags,public.posts,public.post_categories,public.post_tags,public.key_points,public.ads,public.redirects,public.site_settings to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
