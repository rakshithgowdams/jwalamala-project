-- Indexes for every list, count and lookup the news site and admin run.
-- Safe to re-run: a table or column that this database does not have is
-- skipped, and an index whose leading columns are already indexed is skipped.
-- Each step is reported in the Messages / Notices output.

create or replace function pg_temp.ix(idx text, tbl text, cols text[], pred text default null)
returns void language plpgsql as $$
declare
  rel oid := to_regclass('public.' || quote_ident(tbl));
  names text[];
  nums int2[];
  col text;
  num int2;
begin
  if rel is null then
    raise notice 'skip %: table % not found', idx, tbl;
    return;
  end if;
  foreach col in array cols loop
    names := names || split_part(col, ' ', 1);
  end loop;
  foreach col in array names loop
    select attnum into num from pg_attribute
     where attrelid = rel and attname = col and not attisdropped;
    if num is null then
      raise notice 'skip %: column %.% not found', idx, tbl, col;
      return;
    end if;
    nums := nums || num;
  end loop;
  if exists (
    select 1 from pg_index i
     where i.indrelid = rel
       and (pred is null) = (i.indpred is null)
       and (select array_agg(k) from (select unnest(i.indkey::int2[]) k limit array_length(nums, 1)) s) = nums
  ) then
    raise notice 'skip %: already covered on %', idx, tbl;
    return;
  end if;
  execute format('create index if not exists %I on public.%I (%s)%s',
    idx, tbl, array_to_string(cols, ', '),
    case when pred is null then '' else ' where ' || pred end);
  raise notice 'created % on %(%)', idx, tbl, array_to_string(cols, ', ');
end;
$$;

-- Audit history and the dashboard "Recent activity" read the newest rows.
select pg_temp.ix('audit_log_created_at_idx', 'audit_log', array['created_at desc']);
select pg_temp.ix('audit_log_table_time_idx', 'audit_log', array['table_name', 'created_at desc']);

-- Articles: admin list sorts by update time; dashboard and site filter by status.
select pg_temp.ix('posts_updated_idx', 'posts', array['updated_at desc']);
select pg_temp.ix('posts_status_updated_idx', 'posts', array['status', 'updated_at desc']);
select pg_temp.ix('posts_place_idx', 'posts', array['place_id']);
select pg_temp.ix('posts_public_author_idx', 'posts', array['public_author_id']);
select pg_temp.ix('posts_early_access_idx', 'posts', array['status', 'early_access_until']);
select pg_temp.ix('posts_featured_idx', 'posts', array['published_at desc'], 'is_featured');
select pg_temp.ix('post_categories_post_idx', 'post_categories', array['post_id']);
select pg_temp.ix('post_tags_post_idx', 'post_tags', array['post_id']);
select pg_temp.ix('post_versions_post_time_idx', 'post_versions', array['post_id', 'created_at desc']);
select pg_temp.ix('post_audio_post_idx', 'post_audio', array['post_id', 'status']);

-- Dashboard analytics read a date window from each daily table.
select pg_temp.ix('post_views_daily_day_idx', 'post_views_daily', array['day']);
select pg_temp.ix('post_engagement_daily_day_idx', 'post_engagement_daily', array['day']);
select pg_temp.ix('traffic_daily_day_idx', 'traffic_daily', array['day']);
select pg_temp.ix('ad_stats_daily_day_idx', 'ad_stats_daily', array['day']);

-- Events, readers and ads counted on the dashboard.
select pg_temp.ix('events_end_date_idx', 'events', array['end_date']);
select pg_temp.ix('events_start_date_idx', 'events', array['start_date']);
select pg_temp.ix('profiles_created_idx', 'profiles', array['created_at']);
select pg_temp.ix('profiles_role_idx', 'profiles', array['role']);
select pg_temp.ix('ads_active_idx', 'ads', array['is_active', 'ends_at']);
select pg_temp.ix('ads_created_idx', 'ads', array['created_at desc']);

-- Moderation queues: filtered by status, newest first.
select pg_temp.ix('submissions_status_idx', 'submissions', array['status', 'created_at desc']);
select pg_temp.ix('post_comments_status_idx', 'post_comments', array['status', 'created_at desc']);
select pg_temp.ix('post_comments_post_idx', 'post_comments', array['post_id']);
select pg_temp.ix('community_submissions_status_idx', 'community_submissions', array['status', 'created_at desc']);
select pg_temp.ix('business_ads_status_idx', 'business_ads', array['status', 'created_at desc']);
select pg_temp.ix('contributor_applications_created_idx', 'contributor_applications', array['created_at desc']);
select pg_temp.ix('contributor_applications_user_idx', 'contributor_applications', array['user_id']);
select pg_temp.ix('notices_created_idx', 'notices', array['created_at desc']);
select pg_temp.ix('notice_messages_notice_idx', 'notice_messages', array['notice_id', 'status', 'created_at']);
select pg_temp.ix('story_assignments_deadline_idx', 'story_assignments', array['deadline_at']);
select pg_temp.ix('automation_jobs_created_idx', 'automation_jobs', array['created_at desc']);
select pg_temp.ix('redirects_created_idx', 'redirects', array['created_at desc']);
select pg_temp.ix('social_posts_status_idx', 'social_posts', array['status']);

-- Reader features keyed by the signed-in user.
select pg_temp.ix('bookmarks_user_post_idx', 'bookmarks', array['user_id', 'post_id']);
select pg_temp.ix('follows_user_target_idx', 'follows', array['user_id', 'target_type', 'target_id']);
select pg_temp.ix('editor_recovery_user_idx', 'editor_recovery', array['user_id', 'draft_key']);
select pg_temp.ix('push_preferences_user_idx', 'push_preferences', array['user_id']);
select pg_temp.ix('push_subscriptions_endpoint_idx', 'push_subscriptions', array['endpoint']);
select pg_temp.ix('push_campaigns_post_idx', 'push_campaigns', array['post_id']);
select pg_temp.ix('push_deliveries_campaign_idx', 'push_deliveries', array['campaign_id']);
select pg_temp.ix('supporters_user_idx', 'supporters', array['user_id']);
select pg_temp.ix('support_checkouts_provider_idx', 'support_checkouts', array['provider_id']);
select pg_temp.ix('ai_suggestions_user_idx', 'ai_suggestions', array['user_id']);

-- Token, email and slug lookups.
select pg_temp.ix('newsletter_subscribers_email_idx', 'newsletter_subscribers', array['email']);
select pg_temp.ix('newsletter_subscribers_token_idx', 'newsletter_subscribers', array['token_hash']);
select pg_temp.ix('newsletter_subscribers_unsub_idx', 'newsletter_subscribers', array['unsubscribe_hash']);
select pg_temp.ix('newsletter_deliveries_issue_idx', 'newsletter_deliveries', array['issue_id']);
select pg_temp.ix('sponsor_reviews_token_idx', 'sponsor_reviews', array['token_hash']);
select pg_temp.ix('redirects_old_path_idx', 'redirects', array['old_path']);
select pg_temp.ix('notices_slug_idx', 'notices', array['slug']);
select pg_temp.ix('places_slug_idx', 'places', array['slug']);

-- Lists sorted by name or order, and per-place weather.
select pg_temp.ix('places_name_idx', 'places', array['name_kn']);
select pg_temp.ix('places_weather_idx', 'places', array['name_kn'], 'show_in_weather');
select pg_temp.ix('tags_name_idx', 'tags', array['name_kn']);
select pg_temp.ix('categories_sort_idx', 'categories', array['sort_order']);
select pg_temp.ix('weather_snapshots_place_idx', 'weather_snapshots', array['place_id']);

-- The audit read policy ran is_staff() once per row; evaluate it once per query.
-- Who can read the audit log is unchanged.
drop policy if exists audit_read on public.audit_log;
create policy audit_read on public.audit_log
  for select to authenticated using ((select public.is_staff()));

-- Refresh planner statistics so the new indexes are used straight away.
analyze;
