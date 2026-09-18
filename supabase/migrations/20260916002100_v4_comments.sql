
create table public.post_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.posts(id) on delete cascade,user_id uuid not null references public.profiles(id),display_name text not null,body text not null check(char_length(body) between 3 and 2000),status text not null default 'pending' check(status in ('pending','approved','rejected')),flagged boolean not null default false,created_at timestamptz not null default now());
create table public.comment_blocks(user_id uuid primary key references public.profiles(id),blocked boolean not null default true);
create table public.comment_reports(comment_id uuid references public.post_comments(id) on delete cascade,user_id uuid references public.profiles(id),reason text not null check(char_length(reason) between 3 and 1000),created_at timestamptz not null default now(),primary key(comment_id,user_id));
alter table public.post_comments enable row level security;alter table public.comment_blocks enable row level security;alter table public.comment_reports enable row level security;
create policy moderate on public.post_comments for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
create policy moderate on public.comment_blocks for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
create policy moderate on public.comment_reports for all to authenticated using(public.has_permission('community.manage')) with check(public.has_permission('community.manage'));
grant select,update on public.post_comments to authenticated;grant select,insert,update,delete on public.comment_blocks to authenticated;grant select,delete on public.comment_reports to authenticated;
grant all on public.post_comments,public.comment_blocks,public.comment_reports to service_role;
create function public.submit_post_comment(target uuid,actor uuid,display_name text,body text,flagged boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.posts where id=target and allow_comments and status='published' and published_at<=now() and (embargo_until is null or embargo_until<=now())) then raise exception 'Comments unavailable';end if;
 insert into public.post_comments(post_id,user_id,display_name,body,flagged) values(target,actor,left(display_name,100),body,flagged or exists(select 1 from public.comment_blocks where user_id=actor and blocked));
end;$$;
revoke all on function public.submit_post_comment(uuid,uuid,text,text,boolean) from public,anon,authenticated;grant execute on function public.submit_post_comment(uuid,uuid,text,text,boolean) to service_role;
create function public.public_post_comments(target uuid) returns table(id uuid,display_name text,body text,created_at timestamptz) language sql stable security definer set search_path='' as $$
 select c.id,c.display_name,c.body,c.created_at from public.post_comments c join public.posts p on p.id=c.post_id where c.post_id=target and c.status='approved' and p.status='published' and p.published_at<=now() and (p.embargo_until is null or p.embargo_until<=now()) and p.allow_comments and exists(select 1 from public.site_settings where key='comments' and value->>'enabled'='true') and not exists(select 1 from public.comment_blocks b where b.user_id=c.user_id and b.blocked) order by c.created_at desc limit 100;
$$;
revoke all on function public.public_post_comments(uuid) from public;grant execute on function public.public_post_comments(uuid) to anon,authenticated,service_role;
