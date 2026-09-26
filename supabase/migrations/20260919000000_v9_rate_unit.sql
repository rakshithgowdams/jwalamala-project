-- market_rates.unit is rendered on /rates next to the value and was the last public string with no translation slot at all. Kannada stays the source of record; empty string means "not translated yet".
alter table public.market_rates add column if not exists unit_en text not null default '';alter table public.market_rates add column if not exists unit_hi text not null default '';
-- No function is recreated here, matching v7: no routine in supabase/migrations references market_rates at all.
