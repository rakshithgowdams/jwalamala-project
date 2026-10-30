-- Editors add SEO keywords to an article; the news site puts them in the page head.
BEGIN;
alter table public.posts add column if not exists seo_keywords text
  check (seo_keywords is null or char_length(seo_keywords) <= 500);
COMMIT;
