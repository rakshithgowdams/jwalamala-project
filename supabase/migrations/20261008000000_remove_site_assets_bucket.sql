-- Article and ad images are ImageKit links and videos are YouTube/Facebook
-- links or embeds, so nothing is uploaded to Supabase Storage any more.
-- Supabase only allows deleting a bucket through the Storage API or the
-- dashboard (Storage → site-assets → Delete bucket); this removes its policies.
-- The article-audio bucket is kept: it holds generated article audio.
BEGIN;
drop policy if exists site_assets_read on storage.objects;
drop policy if exists site_assets_insert on storage.objects;
drop policy if exists site_assets_update on storage.objects;
drop policy if exists site_assets_delete on storage.objects;
COMMIT;
