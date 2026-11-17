-- Social media category (posters + videos) and Instagram/Facebook source tracking.
-- Reverse: delete the three social-* category slugs (only if unused), drop the
-- three posts.social_* columns, leave video_provider.instagram in place
-- (enum values cannot be removed safely).

alter type public.video_provider add value if not exists 'instagram';

alter table public.posts
  add column if not exists social_platform text,
  add column if not exists social_post_url text,
  add column if not exists social_post_id text;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_social_platform_check'
  ) then
    alter table public.posts
      add constraint posts_social_platform_check
      check (social_platform is null or social_platform in ('facebook', 'instagram'));
  end if;
end $$;

create unique index if not exists posts_social_post_url_key
  on public.posts (social_post_url)
  where social_post_url is not null;

insert into public.categories (
  slug, name_kn, name_en, name_hi, parent_id, sort_order, show_in_menu, is_seed
)
values (
  'social-media',
  'ಸಾಮಾಜಿಕ ಜಾಲತಾಣ',
  'Social media',
  'सोशल मीडिया',
  null,
  109,
  true,
  false
)
on conflict (slug) do nothing;

insert into public.categories (
  slug, name_kn, name_en, name_hi, parent_id, sort_order, show_in_menu, is_seed
)
values (
  'social-posters',
  'ಪೋಸ್ಟರ್‌ಗಳು',
  'Posters',
  'पोस्टर',
  (select id from public.categories where slug = 'social-media'),
  120,
  true,
  false
)
on conflict (slug) do nothing;

insert into public.categories (
  slug, name_kn, name_en, name_hi, parent_id, sort_order, show_in_menu, is_seed
)
values (
  'social-videos',
  'ವಿಡಿಯೋಗಳು',
  'Videos',
  'वीडियो',
  (select id from public.categories where slug = 'social-media'),
  121,
  true,
  false
)
on conflict (slug) do nothing;

-- Public listing already returns to_jsonb(p), so the new columns appear without
-- rewriting list_public_posts. Persist them from the editor payload.
create or replace function public.save_editor_post(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  target := public.save_editor_post_chapters(payload);
  if char_length(coalesce(payload->>'body_en', '')) > 200000
    or char_length(coalesce(payload->>'summary_en', '')) > 1000
    or char_length(coalesce(payload->>'body_hi', '')) > 200000
    or char_length(coalesce(payload->>'summary_hi', '')) > 1000
    or char_length(coalesce(payload->>'title_hi', '')) > 300
  then
    raise exception 'Translation too long';
  end if;
  update public.posts set
    body_en = coalesce(payload->>'body_en', ''),
    summary_en = coalesce(payload->>'summary_en', ''),
    title_hi = coalesce(payload->>'title_hi', ''),
    summary_hi = coalesce(payload->>'summary_hi', ''),
    body_hi = coalesce(payload->>'body_hi', ''),
    image_layout = case
      when payload ? 'image_layout'
        and payload->>'image_layout' in ('single', 'split2', 'collage3', 'video')
      then payload->>'image_layout'
      else image_layout
    end,
    social_platform = case
      when payload ? 'social_platform'
      then nullif(payload->>'social_platform', '')
      else social_platform
    end,
    social_post_url = case
      when payload ? 'social_post_url'
      then nullif(payload->>'social_post_url', '')
      else social_post_url
    end,
    social_post_id = case
      when payload ? 'social_post_id'
      then nullif(payload->>'social_post_id', '')
      else social_post_id
    end
  where id = target;
  return target;
end;
$$;

revoke all on function public.save_editor_post(jsonb) from public, anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;

-- Imported Facebook/Instagram thumbnails expire on their CDNs; keep our copy.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-media',
  'post-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

drop policy if exists post_media_read on storage.objects;
create policy post_media_read on storage.objects
  for select using (bucket_id = 'post-media');

drop policy if exists post_media_insert on storage.objects;
create policy post_media_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'post-media'
    and (
      public.has_permission('content.edit')
      or public.has_permission('content.create')
    )
  );

drop policy if exists post_media_update on storage.objects;
create policy post_media_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'post-media'
    and public.has_permission('content.edit')
  )
  with check (
    bucket_id = 'post-media'
    and public.has_permission('content.edit')
  );
