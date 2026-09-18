-- Homepage settings and resumable draft imports.
create function public.save_homepage(configuration jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 if jsonb_typeof(configuration->'sections')<>'array' or jsonb_array_length(configuration->'sections')>8 or octet_length(configuration::text)>12000 then raise exception 'Invalid configuration';end if;
 insert into public.site_settings(key,value) values('homepage',configuration) on conflict(key) do update set value=excluded.value;
end;$$;
revoke all on function public.save_homepage(jsonb) from public,anon;
grant execute on function public.save_homepage(jsonb) to authenticated;
create function public.import_draft_row(job uuid,row_no int,payload jsonb,validation_error text default '') returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.import_jobs; existing public.import_rows; pid uuid; outcome text:='created'; note text:='';
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 select * into j from public.import_jobs where id=job and created_by=auth.uid() for update;
 if j.id is null or row_no<1 or row_no>j.total_rows or row_no>200 or octet_length(payload::text)>300000 then raise exception 'Invalid import';end if;
 select * into existing from public.import_rows where job_id=job and row_number=row_no;
 if existing.id is not null then return jsonb_build_object('result',existing.result,'message',existing.message);end if;
 if nullif(validation_error,'') is not null then outcome:='error';note:=left(validation_error,1000);
 elsif exists(select 1 from public.posts where slug=payload->>'slug' or (nullif(payload->>'video_url','') is not null and video_url=payload->>'video_url')) then outcome:='duplicate';note:='Existing slug or video';
 else
  begin
   payload:=payload-'id'||jsonb_build_object('status','draft','scheduled_for',null,'meaningful_edit',false);
   pid:=public.save_editor_post(payload);
  exception when unique_violation then outcome:='duplicate';note:='Existing slug or video';
   when others then outcome:='error';note:='Invalid row; check required fields and category';
  end;
 end if;
 insert into public.import_rows(job_id,row_number,raw,result,message,post_id) values(job,row_no,payload,outcome,note,pid);
 update public.import_jobs set processed_rows=processed_rows+1,created_rows=created_rows+case when outcome='created' then 1 else 0 end,duplicate_rows=duplicate_rows+case when outcome='duplicate' then 1 else 0 end,error_rows=error_rows+case when outcome='error' then 1 else 0 end,status=case when processed_rows+1>=total_rows then 'completed' else 'running' end where id=job;
 return jsonb_build_object('result',outcome,'message',note);
end;$$;
revoke all on function public.import_draft_row(uuid,int,jsonb,text) from public,anon;
grant execute on function public.import_draft_row(uuid,int,jsonb,text) to authenticated;

-- Publication permission also applies to non-article publishing surfaces.
create function public.guard_v4_publication() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if to_jsonb(new)->>'status' in ('published','active') and auth.role()<>'service_role' and not public.has_permission('content.publish') then raise exception 'Publish permission required';end if;
 return new;
end;$$;
do $$ declare tab text;begin
 foreach tab in array array['liveblogs','galleries','web_stories','quizzes','polls','basadis'] loop
 execute format('create trigger publication_guard before insert or update on public.%I for each row execute function public.guard_v4_publication()',tab);
 end loop;
end;$$;

-- Only an explicit, audited administrator takeover can replace another editor's lock.
create or replace function public.v4_post_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare content_changed boolean:=true;
begin
 if tg_op='UPDATE' then
 content_changed:=(to_jsonb(new)-array['locked_by','locked_at','updated_at','search_vector']) is distinct from (to_jsonb(old)-array['locked_by','locked_at','updated_at','search_vector']);
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
create or replace function public.lock_v4_post(target uuid,release boolean default false,takeover boolean default false) returns boolean language plpgsql security definer set search_path='' as $$
declare p public.posts;
begin
 if not public.can_edit_post(target) then raise exception 'Not permitted';end if;
 select * into p from public.posts where id=target for update;
 if release then if p.locked_by=auth.uid() then update public.posts set locked_by=null,locked_at=null where id=target;return true;end if;return false;end if;
 if p.locked_by is not null and p.locked_by<>auth.uid() and p.locked_at>now()-interval '15 minutes' and not(takeover and public.has_role('admin')) then return false;end if;
 update public.posts set locked_by=auth.uid(),locked_at=now() where id=target;return true;
end;$$;

alter table public.posts add column if not exists breaking_until timestamptz;
alter table public.posts add column if not exists sponsor_name text not null default '';
alter table public.posts add column if not exists allow_comments boolean not null default false;
alter function public.save_editor_post(jsonb) rename to save_editor_post_base;
revoke all on function public.save_editor_post_base(jsonb) from public,anon,authenticated;
create function public.save_editor_post(payload jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare pid uuid; tid uuid;
begin
 pid:=public.save_editor_post_base(payload);
 update public.posts set
  public_author_id=case when payload ? 'public_author_id' then nullif(payload->>'public_author_id','')::uuid else public_author_id end,
  place_id=case when payload ? 'place_id' then nullif(payload->>'place_id','')::uuid else place_id end,
  event_id=case when payload ? 'event_id' then nullif(payload->>'event_id','')::uuid else event_id end,
  is_featured=coalesce((payload->>'is_featured')::boolean,is_featured),
  is_breaking=coalesce((payload->>'is_breaking')::boolean,is_breaking),
  breaking_until=case when payload ? 'breaking_until' then nullif(payload->>'breaking_until','')::timestamptz else breaking_until end,
  is_live=coalesce((payload->>'is_live')::boolean,is_live),
  sponsor_name=coalesce(payload->>'sponsor_name',sponsor_name),
  allow_comments=coalesce((payload->>'allow_comments')::boolean,allow_comments),
  transcript=coalesce(payload->>'transcript',transcript),
  seo_title=coalesce(payload->>'seo_title',seo_title),
  seo_description=coalesce(payload->>'seo_description',seo_description)
 where id=pid;
 if payload ? 'tag_ids' then
  if jsonb_array_length(payload->'tag_ids')>20 then raise exception 'Too many tags';end if;
  delete from public.post_tags where post_id=pid;
  for tid in select value::uuid from jsonb_array_elements_text(payload->'tag_ids') loop insert into public.post_tags(post_id,tag_id) values(pid,tid) on conflict do nothing;end loop;
 end if;
 return pid;
end;$$;
revoke all on function public.save_editor_post(jsonb) from public,anon;
grant execute on function public.save_editor_post(jsonb) to authenticated;
