create unique index calendar_import_identity on public.jain_calendar_days(date,title_kn);
create unique index rates_import_identity on public.market_rates(rate_date,kind,place_id) nulls not distinct;
