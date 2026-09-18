insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('article-audio','article-audio',true,20971520,array['audio/mpeg']) on conflict(id) do nothing;
create policy article_audio_public on storage.objects for select using(bucket_id='article-audio');
create unique index unique_pending_audio_job on public.automation_jobs((payload->>'post_id')) where kind='article-audio' and status in ('pending','running');
create function public.queue_v4_article_audio() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.status='published' and new.audio_enabled and (tg_op='INSERT' or old.status is distinct from new.status or old.body_html is distinct from new.body_html or old.title_kn is distinct from new.title_kn) then
  if exists(select 1 from public.provider_settings where id='tts' and enabled) then
   insert into public.automation_jobs(kind,payload) values('article-audio',jsonb_build_object('post_id',new.id)) on conflict do nothing;
  end if;
 end if;
 return new;
end; $$;
create trigger queue_article_audio after insert or update on public.posts for each row execute function public.queue_v4_article_audio();
