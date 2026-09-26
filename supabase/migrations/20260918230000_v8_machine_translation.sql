-- Records which translation columns a machine wrote, so the article can say so.
-- Keys are column names (title_en, body_hi, ...); a key disappears once an editor
-- edits that field, which is how the disclosure clears itself.
alter table public.posts add column if not exists machine_translated jsonb not null default '{}'::jsonb;
