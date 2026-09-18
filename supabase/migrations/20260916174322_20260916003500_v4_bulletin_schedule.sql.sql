alter table public.newsletter_issues add column schedule_key text unique;alter table public.social_posts add column schedule_key text unique;
insert into public.site_settings(key,value) values('distribution_schedule','{"enabled":false,"hours":[7,18],"networks":["newsletter","telegram"]}') on conflict do nothing;
