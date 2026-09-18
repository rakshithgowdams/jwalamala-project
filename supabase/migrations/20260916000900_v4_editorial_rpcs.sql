-- v4 transactional editorial operations. Review before LOCAL application.
create function public.replace_v4_relationships(kind text,parent_id uuid,post_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
declare position integer:=1; pid uuid;
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted'; end if;
 if coalesce(array_length(post_ids,1),0)>200 or cardinality(post_ids)<>(select count(distinct value) from unnest(post_ids) value) then raise exception 'Invalid list'; end if;
 if kind='topics' then
  perform 1 from public.topics where id=parent_id for update;if not found then raise exception 'Not found';end if;
  delete from public.topic_pins where topic_id=parent_id;
  foreach pid in array post_ids loop insert into public.topic_pins(topic_id,post_id,sort_order) values(parent_id,pid,position);position:=position+1;end loop;
 elsif kind='series' then
  perform 1 from public.series where id=parent_id for update;if not found then raise exception 'Not found';end if;
  delete from public.series_items where series_id=parent_id;
  foreach pid in array post_ids loop insert into public.series_items(series_id,post_id,episode_no) values(parent_id,pid,position);position:=position+1;end loop;
 else raise exception 'Invalid collection';
 end if;
end; $$;
revoke all on function public.replace_v4_relationships(text,uuid,uuid[]) from public,anon;
grant execute on function public.replace_v4_relationships(text,uuid,uuid[]) to authenticated;

create function public.merge_v4_tags(source_id uuid,destination_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if not public.has_permission('content.edit') then raise exception 'Not permitted';end if;
 if source_id=destination_id then raise exception 'Invalid merge';end if;
 perform 1 from public.tags where id in (source_id,destination_id) order by id for update;
 if not exists(select 1 from public.tags where id=source_id and merged_into_id is null) or not exists(select 1 from public.tags where id=destination_id and merged_into_id is null) then raise exception 'Invalid tags';end if;
 insert into public.post_tags(post_id,tag_id) select post_id,destination_id from public.post_tags where tag_id=source_id on conflict do nothing;
 delete from public.post_tags where tag_id=source_id;
 update public.tags set merged_into_id=destination_id where id=source_id or merged_into_id=source_id;
 update public.topics set tag_ids=array(select distinct value from unnest(array_replace(tag_ids,source_id,destination_id)) value) where source_id=any(tag_ids);
 insert into public.follows(user_id,target_type,target_id,label_kn) select user_id,'tag',destination_id,(select name_kn from public.tags where id=destination_id) from public.follows where target_type='tag' and target_id=source_id on conflict do nothing;
 delete from public.follows where target_type='tag' and target_id=source_id;
end; $$;
revoke all on function public.merge_v4_tags(uuid,uuid) from public,anon;
grant execute on function public.merge_v4_tags(uuid,uuid) to authenticated;

create function public.moderate_v4_submission(submission_id uuid,decision text) returns uuid language plpgsql security definer set search_path='' as $$
declare submission public.community_submissions; result_id uuid; p jsonb;
begin
 if not public.has_permission('community.manage') then raise exception 'Not permitted';end if;
 if decision not in ('approved','rejected') then raise exception 'Invalid decision';end if;
 select * into submission from public.community_submissions where id=submission_id for update;
 if not found then raise exception 'Not found';end if;
 if submission.status<>'pending' then return submission.published_id;end if;
 p:=submission.payload;
 if decision='approved' then
  if submission.kind='notice' then
   insert into public.notices(slug,type,title_kn,body_kn,place_id,event_date,status,published_at)
   values('notice-'||submission.id,p->>'type',p->>'title_kn',p->>'body_kn',nullif(p->>'place_id','')::uuid,(p->>'date')::date,'approved',now()) returning id into result_id;
  elsif submission.kind='opportunity' then
   insert into public.opportunities(slug,title_kn,org,kind,place_id,last_date,link,description_kn,status)
   values('opportunity-'||submission.id,p->>'title_kn',coalesce(p->>'org',''),p->>'type',nullif(p->>'place_id','')::uuid,(p->>'date')::date,nullif(p->>'link',''),p->>'body_kn','approved') returning id into result_id;
  elsif submission.kind='condolence' then
   if not exists(select 1 from public.notices where id=(p->>'target_id')::uuid and status='approved') then raise exception 'Notice not published';end if;
   insert into public.notice_messages(notice_id,name,message,status) values((p->>'target_id')::uuid,p->>'name',p->>'body_kn','approved') returning id into result_id;
  end if;
 end if;
 update public.community_submissions set status=decision,reviewed_by=(select auth.uid()),published_id=result_id where id=submission_id;
 return result_id;
end; $$;
revoke all on function public.moderate_v4_submission(uuid,text) from public,anon;
grant execute on function public.moderate_v4_submission(uuid,text) to authenticated;

create function public.record_v4_vote(poll uuid,choice integer,device text,actor uuid default null) returns void language plpgsql security definer set search_path='' as $$
declare current_poll public.polls;
begin
 select * into current_poll from public.polls where id=poll for update;
 if not found or current_poll.status<>'active' or current_poll.ends_at<=now() then raise exception 'Poll closed';end if;
 if choice<0 or choice>=jsonb_array_length(current_poll.options) then raise exception 'Invalid choice';end if;
 insert into public.poll_votes(poll_id,option_index,user_id,device_hash) values(poll,choice,actor,device);
end; $$;
revoke all on function public.record_v4_vote(uuid,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.record_v4_vote(uuid,integer,text,uuid) to service_role;

create function public.v4_poll_results(poll uuid) returns table(option_index integer,votes bigint) language sql stable security definer set search_path='' as $$
 select v.option_index,count(*) from public.poll_votes v join public.polls p on p.id=v.poll_id where p.id=poll and p.status in ('active','closed') group by v.option_index order by v.option_index;
$$;
grant execute on function public.v4_poll_results(uuid) to anon,authenticated;

create function public.cap_reading_history() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.reading_history where user_id=new.user_id and post_id in (select post_id from public.reading_history where user_id=new.user_id order by last_viewed_at desc offset 200);
 return new;
end; $$;
create trigger cap_history after insert or update on public.reading_history for each row execute function public.cap_reading_history();

-- Realtime sends only published live-blog updates through RLS.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='liveblog_updates') then alter publication supabase_realtime add table public.liveblog_updates;end if;
end; $$;
