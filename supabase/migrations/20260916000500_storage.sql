insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('site-assets','site-assets',true,1048576,array['image/jpeg','image/png','image/webp','image/avif']);
create policy site_assets_read on storage.objects for select using(bucket_id='site-assets');
create policy site_assets_insert on storage.objects for insert to authenticated with check(bucket_id='site-assets' and public.is_staff());
create policy site_assets_update on storage.objects for update to authenticated using(bucket_id='site-assets' and public.is_staff()) with check(bucket_id='site-assets' and public.is_staff());
create policy site_assets_delete on storage.objects for delete to authenticated using(bucket_id='site-assets' and public.has_role('admin'));
